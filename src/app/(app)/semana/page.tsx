import { createClient } from "@/lib/supabase/server";
import { weekStart } from "@/lib/dates";
import {
  decidirRollover,
  moverTodosProximaSemana,
  selecionarItens,
} from "./actions";

type ItemRow = { id: string; titulo: string };
type RolloverCandidato = { item_id: string; itens: ItemRow };
type Habito = { id: string; nome: string; meta_semanal: number };

export default async function SemanaPage() {
  const supabase = await createClient();
  const semanaAtual = weekStart(0);
  const semanaAnterior = weekStart(-1);

  const [
    candidatosResult,
    rolloversAnterioresResult,
    itensAbertosResult,
    descartadosResult,
    selecionadosAtualResult,
    habitosResult,
  ] = await Promise.all([
    supabase
      .from("selecoes_semanais")
      .select("item_id, itens!inner(id,titulo,status)")
      .eq("semana_referencia", semanaAnterior)
      .eq("itens.status", "aberto")
      .returns<RolloverCandidato[]>(),
    supabase
      .from("rollovers")
      .select("item_id")
      .eq("semana_referencia", semanaAnterior),
    supabase
      .from("itens")
      .select("id,titulo,entregaveis_mensais!inner(estado)")
      .eq("status", "aberto")
      .eq("entregaveis_mensais.estado", "confirmado")
      .returns<ItemRow[]>(),
    supabase.from("rollovers").select("item_id").eq("destino", "descartado"),
    supabase
      .from("selecoes_semanais")
      .select("item_id")
      .eq("semana_referencia", semanaAtual),
    supabase
      .from("habitos")
      .select("id,nome,meta_semanal")
      .eq("ativo", true)
      .returns<Habito[]>(),
  ]);

  const jaDecididos = new Set(
    (rolloversAnterioresResult.data ?? []).map((r) => r.item_id),
  );
  const pendentesRollover = (candidatosResult.data ?? []).filter(
    (c) => !jaDecididos.has(c.item_id),
  );

  const descartadosIds = new Set(
    (descartadosResult.data ?? []).map((r) => r.item_id),
  );
  const selecionadosAtualIds = new Set(
    (selecionadosAtualResult.data ?? []).map((r) => r.item_id),
  );
  const elegiveisSelecao = (itensAbertosResult.data ?? []).filter(
    (item) => !descartadosIds.has(item.id) && !selecionadosAtualIds.has(item.id),
  );

  const bloco1Vazio = pendentesRollover.length === 0;

  const habitos = habitosResult.data ?? [];
  let logsPorHabito = new Map<string, number>();
  if (habitos.length > 0) {
    const fimSemanaAnterior = new Date(semanaAnterior);
    fimSemanaAnterior.setUTCDate(fimSemanaAnterior.getUTCDate() + 6);
    const { data: logs } = await supabase
      .from("logs_habitos")
      .select("habito_id")
      .in(
        "habito_id",
        habitos.map((h) => h.id),
      )
      .eq("concluido", true)
      .gte("data", semanaAnterior)
      .lte("data", fimSemanaAnterior.toISOString().slice(0, 10));

    logsPorHabito = new Map();
    for (const log of logs ?? []) {
      logsPorHabito.set(log.habito_id, (logsPorHabito.get(log.habito_id) ?? 0) + 1);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-6 py-10">
      <h1 className="text-2xl font-semibold">Ritual da semana</h1>

      <section>
        <h2 className="mb-3 text-sm font-medium">
          1. Decidir o que ficou pra trás{" "}
          <span className="text-muted-foreground font-mono text-xs">
            ({pendentesRollover.length})
          </span>
        </h2>
        {pendentesRollover.length === 0 ? (
          <p className="text-muted-foreground text-sm">Tudo decidido.</p>
        ) : (
          <div className="space-y-2">
            {pendentesRollover.map((c) => (
              <div
                key={c.item_id}
                className="border-border flex items-center justify-between rounded-md border px-4 py-2 text-sm"
              >
                <span>{c.itens.titulo}</span>
                <div className="flex gap-2">
                  <form
                    action={decidirRollover.bind(
                      null,
                      c.item_id,
                      semanaAnterior,
                      "proxima_semana",
                    )}
                  >
                    <button
                      type="submit"
                      className="border-border rounded-md border px-2 py-1 text-xs"
                    >
                      → Próxima semana
                    </button>
                  </form>
                  <form
                    action={decidirRollover.bind(
                      null,
                      c.item_id,
                      semanaAnterior,
                      "descartado",
                    )}
                  >
                    <button
                      type="submit"
                      className="text-muted-foreground hover:text-destructive rounded-md border border-transparent px-2 py-1 text-xs"
                    >
                      ✕ Descartar
                    </button>
                  </form>
                </div>
              </div>
            ))}
            <form
              action={moverTodosProximaSemana.bind(
                null,
                pendentesRollover.map((c) => c.item_id),
                semanaAnterior,
              )}
            >
              <button
                type="submit"
                className="text-muted-foreground hover:text-foreground text-xs underline"
              >
                Mover todos p/ semana
              </button>
            </form>
          </div>
        )}
      </section>

      <section className={bloco1Vazio ? "" : "pointer-events-none opacity-40"}>
        <h2 className="mb-3 text-sm font-medium">
          2. Escolher a semana{" "}
          {!bloco1Vazio && (
            <span className="text-muted-foreground font-mono text-xs">
              🔒 resolva o bloco 1
            </span>
          )}
        </h2>
        {elegiveisSelecao.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum item aberto de entregável confirmado.
          </p>
        ) : (
          <form action={selecionarItens} className="space-y-2">
            <input type="hidden" name="semana_referencia" value={semanaAtual} />
            {elegiveisSelecao.map((item) => (
              <label
                key={item.id}
                className="border-border flex items-center gap-2 rounded-md border px-4 py-2 text-sm"
              >
                <input type="checkbox" name="item_id" value={item.id} />
                {item.titulo}
              </label>
            ))}
            <button
              type="submit"
              disabled={!bloco1Vazio}
              className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Adicionar à semana
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">
          3. Hábitos da semana passada
        </h2>
        {habitos.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum hábito cadastrado.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {habitos.map((h) => (
              <li key={h.id} className="font-mono">
                {h.nome}: {logsPorHabito.get(h.id) ?? 0}/{h.meta_semanal}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
