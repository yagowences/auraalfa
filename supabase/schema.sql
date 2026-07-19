-- Aura Alfa — schema completo (Fase 0.2 do plano)
--
-- Fonte de verdade única para esta fase: colar no SQL editor do Supabase
-- (ou aplicar via `supabase db push` depois que o projeto existir e o CLI
-- estiver linkado). Uma tabela de migrations formal só compensa quando
-- houver histórico de alterações incrementais — nesta fase o schema nasce
-- e evolui inteiro de uma vez.
--
-- Duas garantias do produto aplicadas aqui como constraint, não convenção:
--   1. itens.entregavel_id é NOT NULL — nenhum item existe solto.
--   2. rollovers é o único jeito de "resolver" um item não concluído da
--      semana anterior — a UI (Fase 1) que impede pular essa etapa.
--
-- Padrão de RLS usado (skill supabase-postgres-best-practices,
-- security-rls-performance.md): auth.uid() sempre envolvido em subselect
-- (cacheado por statement, não chamado por linha), e tabelas subordinadas
-- usam uma função SECURITY DEFINER por nível da cascata em vez de EXISTS
-- inline repetido em cada policy.

create extension if not exists pgcrypto;

create schema if not exists private;

-- ============================================================
-- TABELAS
-- ============================================================

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'America/Sao_Paulo',
  janela_acordado_inicio time not null default '07:00',
  janela_acordado_fim time not null default '22:00',
  created_at timestamptz not null default now(),
  check (janela_acordado_fim > janela_acordado_inicio)
);

create table public.metas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  titulo text not null,
  descricao text,
  data_alvo date,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);
create index metas_usuario_id_idx on public.metas (usuario_id);

create table public.fases (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid not null references public.metas (id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  data_inicio date,
  data_fim date,
  created_at timestamptz not null default now(),
  check (data_fim is null or data_inicio is null or data_fim >= data_inicio)
);
create index fases_meta_id_idx on public.fases (meta_id);

create table public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid not null references public.metas (id) on delete cascade,
  mes_gatilho date not null,
  descricao text,
  created_at timestamptz not null default now()
);
create index checkpoints_meta_id_idx on public.checkpoints (meta_id);
create index checkpoints_mes_gatilho_idx on public.checkpoints (mes_gatilho);

create table public.entregaveis_mensais (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid not null references public.metas (id) on delete cascade,
  mes date not null,
  titulo text not null,
  estado text not null default 'planejado'
    check (estado in ('planejado', 'confirmado', 'concluido')),
  origem text not null default 'pre_criado'
    check (origem in ('pre_criado', 'criado_no_ritual')),
  created_at timestamptz not null default now()
);
create index entregaveis_meta_id_idx on public.entregaveis_mensais (meta_id);
create index entregaveis_mes_idx on public.entregaveis_mensais (mes);

-- Regra de ouro: entregavel_id NOT NULL, sem exceção, sem coluna nullable
-- "temporária". A própria coluna recusa a escrita de item solto.
create table public.itens (
  id uuid primary key default gen_random_uuid(),
  entregavel_id uuid not null references public.entregaveis_mensais (id) on delete cascade,
  titulo text not null,
  status text not null default 'aberto'
    check (status in ('aberto', 'concluido')),
  duracao_estimada_min int check (duracao_estimada_min > 0),
  divisivel boolean not null default false,
  tamanho_bloco_min int check (tamanho_bloco_min > 0),
  janela_preferida text default 'qualquer'
    check (janela_preferida in ('manha', 'tarde', 'noite', 'qualquer')),
  created_at timestamptz not null default now()
);
create index itens_entregavel_id_idx on public.itens (entregavel_id);
create index itens_entregavel_status_idx on public.itens (entregavel_id, status);

create table public.selecoes_semanais (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.itens (id) on delete cascade,
  semana_referencia date not null,
  created_at timestamptz not null default now(),
  unique (item_id, semana_referencia)
);
create index selecoes_item_id_idx on public.selecoes_semanais (item_id);
create index selecoes_semana_referencia_idx on public.selecoes_semanais (semana_referencia);

-- Data/hora do agendamento vivem aqui, não em selecoes_semanais — um item
-- divisível (Fase 2, motor de auto-agendamento) pode virar N blocos em
-- dias diferentes, e selecoes_semanais é 1 linha por item por semana.
-- hora_inicio/hora_fim ficam nullable: o motor sempre preenche as duas,
-- mas o atalho manual "agendar pra hoje" (Fase 1, antes do motor existir)
-- só define a data, sem hora específica.
create table public.blocos_agendados (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.itens (id) on delete cascade,
  semana_referencia date not null,
  data date not null,
  hora_inicio time,
  hora_fim time,
  origem_bloco text not null
    check (origem_bloco in ('sugerido', 'fixado_manual')),
  created_at timestamptz not null default now(),
  check (hora_fim is null or hora_inicio is null or hora_fim > hora_inicio)
);
create index blocos_agendados_item_id_idx on public.blocos_agendados (item_id);
create index blocos_agendados_semana_referencia_idx on public.blocos_agendados (semana_referencia);
create index blocos_agendados_data_idx on public.blocos_agendados (data);

create table public.rollovers (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.itens (id) on delete cascade,
  semana_referencia date not null,
  destino text not null check (destino in ('proxima_semana', 'descartado')),
  decidido_em timestamptz not null default now(),
  unique (item_id, semana_referencia)
);
create index rollovers_item_id_idx on public.rollovers (item_id);
create index rollovers_semana_referencia_idx on public.rollovers (semana_referencia);

create table public.compromissos_fixos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  titulo text not null,
  dia_semana int not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fim time not null,
  created_at timestamptz not null default now(),
  check (hora_fim > hora_inicio)
);
create index compromissos_usuario_id_idx on public.compromissos_fixos (usuario_id);

create table public.habitos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  nome text not null,
  meta_semanal int not null default 7 check (meta_semanal between 1 and 7),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index habitos_usuario_id_idx on public.habitos (usuario_id);

create table public.logs_habitos (
  id uuid primary key default gen_random_uuid(),
  habito_id uuid not null references public.habitos (id) on delete cascade,
  data date not null,
  concluido boolean not null default true,
  created_at timestamptz not null default now(),
  unique (habito_id, data)
);
create index logs_habitos_habito_id_idx on public.logs_habitos (habito_id);

-- ============================================================
-- FUNÇÕES DE DONO (schema private, usadas pelas policies das tabelas
-- subordinadas). SECURITY DEFINER com search_path fixo vazio, referência
-- de tabela sempre qualificada com public. — padrão de segurança contra
-- search_path hijacking.
--
-- Nota sobre grants: o exemplo do skill supabase-postgres-best-practices
-- revoga EXECUTE de "authenticated" também, mas isso quebraria a própria
-- policy (o Postgres exige EXECUTE pra role que está rodando a query,
-- mesmo dentro de uma policy). Aqui revogamos de PUBLIC e concedemos
-- EXECUTE só para "authenticated" — anon não tem, e não precisa, porque
-- este schema não é exposto via API do Supabase de qualquer forma.
-- ============================================================

create or replace function private.owns_meta(p_meta_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.metas
    where id = p_meta_id and usuario_id = (select auth.uid())
  );
$$;
revoke all on function private.owns_meta(uuid) from public;
grant execute on function private.owns_meta(uuid) to authenticated;

create or replace function private.owns_entregavel(p_entregavel_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.entregaveis_mensais e
    join public.metas m on m.id = e.meta_id
    where e.id = p_entregavel_id and m.usuario_id = (select auth.uid())
  );
$$;
revoke all on function private.owns_entregavel(uuid) from public;
grant execute on function private.owns_entregavel(uuid) to authenticated;

create or replace function private.owns_item(p_item_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.itens i
    join public.entregaveis_mensais e on e.id = i.entregavel_id
    join public.metas m on m.id = e.meta_id
    where i.id = p_item_id and m.usuario_id = (select auth.uid())
  );
$$;
revoke all on function private.owns_item(uuid) from public;
grant execute on function private.owns_item(uuid) to authenticated;

create or replace function private.owns_habito(p_habito_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.habitos
    where id = p_habito_id and usuario_id = (select auth.uid())
  );
$$;
revoke all on function private.owns_habito(uuid) from public;
grant execute on function private.owns_habito(uuid) to authenticated;

-- ============================================================
-- RLS — habilitar + forçar em toda tabela, policy única "for all"
-- por tabela (mesma regra pra select/insert/update/delete).
-- ============================================================

alter table public.usuarios enable row level security;
alter table public.usuarios force row level security;
create policy usuarios_self on public.usuarios
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter table public.metas enable row level security;
alter table public.metas force row level security;
create policy metas_owner on public.metas
  for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

alter table public.compromissos_fixos enable row level security;
alter table public.compromissos_fixos force row level security;
create policy compromissos_owner on public.compromissos_fixos
  for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

alter table public.habitos enable row level security;
alter table public.habitos force row level security;
create policy habitos_owner on public.habitos
  for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

alter table public.fases enable row level security;
alter table public.fases force row level security;
create policy fases_owner on public.fases
  for all to authenticated
  using ((select private.owns_meta(meta_id)))
  with check ((select private.owns_meta(meta_id)));

alter table public.checkpoints enable row level security;
alter table public.checkpoints force row level security;
create policy checkpoints_owner on public.checkpoints
  for all to authenticated
  using ((select private.owns_meta(meta_id)))
  with check ((select private.owns_meta(meta_id)));

alter table public.entregaveis_mensais enable row level security;
alter table public.entregaveis_mensais force row level security;
create policy entregaveis_owner on public.entregaveis_mensais
  for all to authenticated
  using ((select private.owns_meta(meta_id)))
  with check ((select private.owns_meta(meta_id)));

alter table public.itens enable row level security;
alter table public.itens force row level security;
create policy itens_owner on public.itens
  for all to authenticated
  using ((select private.owns_entregavel(entregavel_id)))
  with check ((select private.owns_entregavel(entregavel_id)));

alter table public.selecoes_semanais enable row level security;
alter table public.selecoes_semanais force row level security;
create policy selecoes_owner on public.selecoes_semanais
  for all to authenticated
  using ((select private.owns_item(item_id)))
  with check ((select private.owns_item(item_id)));

alter table public.blocos_agendados enable row level security;
alter table public.blocos_agendados force row level security;
create policy blocos_agendados_owner on public.blocos_agendados
  for all to authenticated
  using ((select private.owns_item(item_id)))
  with check ((select private.owns_item(item_id)));

alter table public.rollovers enable row level security;
alter table public.rollovers force row level security;
create policy rollovers_owner on public.rollovers
  for all to authenticated
  using ((select private.owns_item(item_id)))
  with check ((select private.owns_item(item_id)));

alter table public.logs_habitos enable row level security;
alter table public.logs_habitos force row level security;
create policy logs_habitos_owner on public.logs_habitos
  for all to authenticated
  using ((select private.owns_habito(habito_id)))
  with check ((select private.owns_habito(habito_id)));

-- ============================================================
-- VIEWS — security_invoker = true é obrigatório aqui: sem isso, a view
-- roda com o privilégio de quem a criou (dono do schema), ignorando a
-- RLS das tabelas de baixo. Com security_invoker, a RLS de quem consulta
-- a view continua valendo.
-- ============================================================

create view public.progresso_entregaveis
with (security_invoker = true) as
select
  e.id as entregavel_id,
  e.meta_id,
  e.mes,
  e.titulo,
  e.estado,
  count(i.id) as itens_totais,
  count(i.id) filter (where i.status = 'concluido') as itens_concluidos,
  case
    when count(i.id) = 0 then 0
    else round(count(i.id) filter (where i.status = 'concluido')::numeric / count(i.id), 4)
  end as fracao_concluida
from public.entregaveis_mensais e
left join public.itens i on i.entregavel_id = e.id
group by e.id;

create view public.capacidade_semanal
with (security_invoker = true) as
select
  m.usuario_id,
  s.semana_referencia,
  sum(i.duracao_estimada_min) as minutos_selecionados
from public.selecoes_semanais s
join public.itens i on i.id = s.item_id
join public.entregaveis_mensais e on e.id = i.entregavel_id
join public.metas m on m.id = e.meta_id
group by m.usuario_id, s.semana_referencia;

-- ============================================================
-- AUTH TRIGGER — cria a linha em usuarios assim que a conta é criada no
-- Supabase Auth (Fase 0.3). Sem isso, o primeiro login ficaria sem
-- usuario_id pra pendurar meta/hábito/compromisso nenhum.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
