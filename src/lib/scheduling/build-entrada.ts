import type { SupabaseClient } from "@supabase/supabase-js";
import { weekStart } from "@/lib/dates";
import type { EntradaAgendamento, ItemParaAgendar, JanelaPreferida } from "./types";

function ultimoDiaDoMes(mesIso: string): string {
  const [ano, mes] = mesIso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes, 0)); // dia 0 do próximo mês = último dia deste
  return d.toISOString().slice(0, 10);
}

type ItemComEntregavel = {
  id: string;
  status: string;
  duracao_estimada_min: number | null;
  divisivel: boolean;
  tamanho_bloco_min: number | null;
  janela_preferida: JanelaPreferida | null;
  entregavel_id: string;
  created_at: string;
  entregaveis_mensais: { mes: string } | null;
};

// Monta a entrada do motor (seção 7) a partir do banco: itens selecionados
// pra semana que ainda não estão "fixado_manual" (esses o motor não toca),
// compromissos fixos do usuário, e a janela acordado de usuarios.
export async function buildEntradaAgendamento(
  supabase: SupabaseClient,
  usuarioId: string,
  semanaReferencia: string,
): Promise<EntradaAgendamento> {
  const semanaAnterior = weekStart(-1);

  const [selecoesResult, blocosFixadosResult, rolloversResult, compromissosResult, usuarioResult] =
    await Promise.all([
      supabase
        .from("selecoes_semanais")
        .select(
          "item_id, itens(id,status,duracao_estimada_min,divisivel,tamanho_bloco_min,janela_preferida,entregavel_id,created_at,entregaveis_mensais(mes))",
        )
        .eq("semana_referencia", semanaReferencia),
      supabase
        .from("blocos_agendados")
        .select("item_id")
        .eq("semana_referencia", semanaReferencia)
        .eq("origem_bloco", "fixado_manual"),
      supabase
        .from("rollovers")
        .select("item_id")
        .eq("semana_referencia", semanaAnterior)
        .eq("destino", "proxima_semana"),
      supabase.from("compromissos_fixos").select("dia_semana,hora_inicio,hora_fim"),
      supabase
        .from("usuarios")
        .select("janela_acordado_inicio,janela_acordado_fim")
        .eq("id", usuarioId)
        .single(),
    ]);

  const idsFixados = new Set(
    (blocosFixadosResult.data ?? []).map((b) => b.item_id as string),
  );
  const idsRollover = new Set(
    (rolloversResult.data ?? []).map((r) => r.item_id as string),
  );

  type SelecaoRow = { item_id: string; itens: ItemComEntregavel | null };
  const selecoes = (selecoesResult.data ?? []) as unknown as SelecaoRow[];

  const itensSelecionados: ItemParaAgendar[] = selecoes
    .filter((s) => s.itens && s.itens.status === "aberto" && !idsFixados.has(s.item_id))
    .map((s) => {
      const item = s.itens!;
      return {
        id: item.id,
        duracaoEstimadaMin: item.duracao_estimada_min ?? 30,
        divisivel: item.divisivel,
        tamanhoBlocoMin: item.tamanho_bloco_min,
        janelaPreferida: item.janela_preferida ?? "qualquer",
        entregavelId: item.entregavel_id,
        prazoEntregavel: item.entregaveis_mensais ? ultimoDiaDoMes(item.entregaveis_mensais.mes) : null,
        vindoDeRollover: idsRollover.has(item.id),
        criadoEm: item.created_at,
      };
    });

  const compromissosFixos = (compromissosResult.data ?? []).map((c) => ({
    diaSemana: c.dia_semana as number,
    horaInicio: (c.hora_inicio as string).slice(0, 5),
    horaFim: (c.hora_fim as string).slice(0, 5),
  }));

  const usuario = usuarioResult.data as
    | { janela_acordado_inicio: string; janela_acordado_fim: string }
    | null;

  return {
    usuarioId,
    semanaReferencia,
    itensSelecionados,
    compromissosFixos,
    janelaAcordado: {
      inicio: usuario?.janela_acordado_inicio?.slice(0, 5) ?? "07:00",
      fim: usuario?.janela_acordado_fim?.slice(0, 5) ?? "22:00",
    },
    // Nunca sugere em dia que já passou — relevante quando o ritual roda
    // no meio da semana, não só na segunda.
    naoAgendarAntesDe: new Date().toISOString().slice(0, 10),
  };
}
