-- Script de verificação de RLS (Fase 3.2 do plano) — roda no SQL Editor
-- do Supabase, tudo de uma vez numa única execução (não em pedaços — o
-- editor pode não manter o estado de sessão entre execuções separadas).
--
-- Simula duas identidades sem precisar de um segundo cadastro real: troca
-- request.jwt.claims dentro da sessão. `set role authenticated` é
-- obrigatório — sem ele a query roda como a role de login do editor
-- (normalmente bypassrls=true), que ignora RLS completamente e o teste
-- não prova nada.
--
-- Troque USUARIO_DONO_ID por um usuario_id real que tenha dado nas
-- tabelas que você quer checar antes de rodar.

set role authenticated;

-- 1) Confirma que a troca de role funcionou (current_user tem que ser
--    "authenticated", não a role de login do editor)
select current_user as role_atual;

-- 2) Como o usuário dono do dado — contagens > 0 esperadas
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'USUARIO_DONO_ID', 'role', 'authenticated')::text,
  false  -- escopo de sessão, não de transação
);

select 'metas' as tabela, count(*) from metas
union all select 'fases', count(*) from fases
union all select 'checkpoints', count(*) from checkpoints
union all select 'entregaveis_mensais', count(*) from entregaveis_mensais
union all select 'itens', count(*) from itens
union all select 'selecoes_semanais', count(*) from selecoes_semanais
union all select 'rollovers', count(*) from rollovers
union all select 'compromissos_fixos', count(*) from compromissos_fixos
union all select 'habitos', count(*) from habitos
union all select 'logs_habitos', count(*) from logs_habitos
union all select 'blocos_agendados', count(*) from blocos_agendados;

-- 3) Como um usuário qualquer, dono de nada — todas as contagens têm que
--    ser 0. Se alguma vier > 0, a policy dessa tabela está vazando dado.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text,
  false
);

select 'metas' as tabela, count(*) from metas
union all select 'fases', count(*) from fases
union all select 'checkpoints', count(*) from checkpoints
union all select 'entregaveis_mensais', count(*) from entregaveis_mensais
union all select 'itens', count(*) from itens
union all select 'selecoes_semanais', count(*) from selecoes_semanais
union all select 'rollovers', count(*) from rollovers
union all select 'compromissos_fixos', count(*) from compromissos_fixos
union all select 'habitos', count(*) from habitos
union all select 'logs_habitos', count(*) from logs_habitos
union all select 'blocos_agendados', count(*) from blocos_agendados;

reset role;
