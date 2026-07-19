-- Migration 002 — separa data/hora do agendamento de selecoes_semanais pra
-- uma tabela própria (blocos_agendados), porque um item divisível (Fase 2)
-- pode gerar N blocos em dias diferentes — e selecoes_semanais é 1 linha
-- por item por semana, não suporta isso.
--
-- Rodar no SQL editor do projeto Supabase. Seguro mesmo com dado de teste
-- existente: nenhum item real do usuário tinha data_agendada preenchida
-- ainda nesta fase.

alter table public.selecoes_semanais
  drop column if exists data_agendada,
  drop column if exists hora_inicio,
  drop column if exists hora_fim,
  drop column if exists origem_bloco;

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

alter table public.blocos_agendados enable row level security;
alter table public.blocos_agendados force row level security;
create policy blocos_agendados_owner on public.blocos_agendados
  for all to authenticated
  using ((select private.owns_item(item_id)))
  with check ((select private.owns_item(item_id)));
