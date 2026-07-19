import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { weekStart, monthStart } from "@/lib/dates";
import { toggleItemStatus, agendarParaHoje, toggleHabitoHoje } from "./actions";

type CompromissoFixo = {
  id: string;
  titulo: string;
  hora_inicio: string;
  hora_fim: string;
};
type SelecaoComItem = {
  id: string;
  data_agendada: string | null;
  itens: { id: string; titulo: string; status: string };
};
type Habito = { id: string; nome: string };

export default async function Home() {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const diaSemana = new Date().getUTCDay();
  const semanaAtual = weekStart(0);
  const mesAtual = monthStart(0);
  const ehDiaPrimeiro = hoje.endsWith("-01");

  const [
    compromissosResult,
    selecoesResult,
    habitosResult,
    rolloverCandidatosResult,
    rolloverDecididosResult,
    entregaveisPlanejadosResult,
    checkpointsResult,
  ] = await Promise.all([
    supabase
      .from("compromissos_fixos")
      .select("id,titulo,hora_inicio,hora_fim")
      .eq("dia_semana", diaSemana)
      .order("hora_inicio")
      .returns<CompromissoFixo[]>(),
    supabase
      .from("selecoes_semanais")
      .select("id,data_agendada,itens(id,titulo,status)")
      .eq("semana_referencia", semanaAtual)
      .returns<SelecaoComItem[]>(),
    supabase.from("habitos").select("id,nome").eq("ativo", true).returns<Habito[]>(),
    supabase
      .from("selecoes_semanais")
      .select("item_id, itens!inner(status)")
      .eq("semana_referencia", weekStart(-1))
      .eq("itens.status", "aberto"),
    supabase.from("rollovers").select("item_id").eq("semana_referencia", weekStart(-1)),
    supabase
      .from("entregaveis_mensais")
      .select("id")
      .eq("mes", mesAtual)
      .eq("estado", "planejado"),
    supabase.from("checkpoints").select("id").eq("mes_gatilho", mesAtual),
  ]);

  const compromissos = compromissosResult.data ?? [];
  const selecoes = (selecoesResult.data ?? []).filter((s) => s.itens.status === "aberto");
  const agendadosHoje = selecoes.filter((s) => s.data_agendada === hoje);
  const semData = selecoes.filter((s) => s.data_agendada === null);

  const habitos = habitosResult.data ?? [];
  const { data: logsHoje } = habitos.length
    ? await supabase
        .from("logs_habitos")
        .select("habito_id")
        .eq("data", hoje)
        .in(
          "habito_id",
          habitos.map((h) => h.id),
        )
    : { data: [] as { habito_id: string }[] };
  const feitosHojeIds = new Set((logsHoje ?? []).map((l) => l.habito_id));

  const decididos = new Set((rolloverDecididosResult.data ?? []).map((r) => r.item_id));
  const rolloverPendentes = (rolloverCandidatosResult.data ?? []).filter(
    (c) => !decididos.has(c.item_id),
  ).length;

  const mesDevido =
    ehDiaPrimeiro ||
    (entregaveisPlanejadosResult.data?.length ?? 0) > 0 ||
    (checkpointsResult.data?.length ?? 0) > 0;

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      {rolloverPendentes > 0 && (
        <Link
          href="/semana"
          className="border-signature bg-signature/10 text-signature-foreground block rounded-md border px-4 py-3 text-sm"
        >
          ⚠ Ritual da semana — {rolloverPendentes}{" "}
          {rolloverPendentes === 1 ? "item pendente" : "itens pendentes"} de decisão →
        </Link>
      )}
      {mesDevido && (
        <Link
          href="/mes"
          className="border-border bg-muted block rounded-md border px-4 py-3 text-sm"
        >
          Ritual do mês disponível →
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium">Agenda de hoje</h2>
        <ul className="space-y-2">
          {compromissos.map((c) => (
            <li key={c.id} className="text-muted-foreground flex gap-3 text-sm">
              <span className="font-mono text-xs">
                {c.hora_inicio.slice(0, 5)}–{c.hora_fim.slice(0, 5)}
              </span>
              <span>{c.titulo} (fixo)</span>
            </li>
          ))}
          {agendadosHoje.map((s) => (
            <li key={s.id} className="flex items-center gap-3 text-sm">
              <form action={toggleItemStatus.bind(null, s.itens.id, true)}>
                <button
                  type="submit"
                  className="border-muted-foreground h-4 w-4 rounded-full border"
                  aria-label="Concluir"
                />
              </form>
              <span>{s.itens.titulo}</span>
            </li>
          ))}
          {compromissos.length === 0 && agendadosHoje.length === 0 && (
            <p className="text-muted-foreground text-sm">Nada agendado pra hoje.</p>
          )}
        </ul>
      </section>

      {semData.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium">Sem data (dessa semana)</h2>
          <ul className="space-y-2">
            {semData.map((s) => (
              <li
                key={s.id}
                className="border-border flex items-center justify-between rounded-md border px-4 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <form action={toggleItemStatus.bind(null, s.itens.id, true)}>
                    <button
                      type="submit"
                      className="border-muted-foreground h-4 w-4 rounded-full border"
                      aria-label="Concluir"
                    />
                  </form>
                  <span>{s.itens.titulo}</span>
                </div>
                <form action={agendarParaHoje.bind(null, s.id)}>
                  <button type="submit" className="text-muted-foreground text-xs underline">
                    Agendar pra hoje
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium">Hábitos de hoje</h2>
        {habitos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum hábito cadastrado —{" "}
            <Link href="/habitos" className="text-primary underline">
              criar um
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {habitos.map((h) => {
              const feito = feitosHojeIds.has(h.id);
              return (
                <form key={h.id} action={toggleHabitoHoje.bind(null, h.id, feito)}>
                  <button
                    type="submit"
                    className={
                      feito
                        ? "bg-success text-success-foreground rounded-full px-3 py-1 text-xs"
                        : "border-border rounded-full border px-3 py-1 text-xs"
                    }
                  >
                    {h.nome}
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
