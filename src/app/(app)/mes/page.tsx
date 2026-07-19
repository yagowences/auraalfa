import { createClient } from "@/lib/supabase/server";
import { monthStart } from "@/lib/dates";
import type { Meta, Checkpoint, ProgressoEntregavel } from "@/lib/types";
import { confirmEntregavel, createEntregavel, createItens } from "./actions";

type Item = { id: string; entregavel_id: string; titulo: string; status: string };

export default async function MesPage() {
  const supabase = await createClient();
  const mesAtual = monthStart();
  const mesAnterior = monthStart(-1);

  const [metasResult, checkpointsResult, progressoAnteriorResult, progressoAtualResult] =
    await Promise.all([
      supabase
        .from("metas")
        .select("id,usuario_id,titulo,descricao,data_alvo,ativa,created_at")
        .eq("ativa", true)
        .order("titulo")
        .returns<Meta[]>(),
      supabase
        .from("checkpoints")
        .select("*")
        .eq("mes_gatilho", mesAtual)
        .returns<Checkpoint[]>(),
      supabase
        .from("progresso_entregaveis")
        .select("*")
        .eq("mes", mesAnterior)
        .returns<ProgressoEntregavel[]>(),
      supabase
        .from("progresso_entregaveis")
        .select("*")
        .eq("mes", mesAtual)
        .returns<ProgressoEntregavel[]>(),
    ]);

  const metas = metasResult.data ?? [];
  const checkpoints = checkpointsResult.data ?? [];
  const progressoAnterior = progressoAnteriorResult.data ?? [];
  const progressoAtual = progressoAtualResult.data ?? [];

  const confirmadosAtual = progressoAtual.filter((p) => p.estado !== "planejado");
  const entregavelIds = confirmadosAtual.map((p) => p.entregavel_id);

  const { data: itensData } = entregavelIds.length
    ? await supabase
        .from("itens")
        .select("id,entregavel_id,titulo,status")
        .in("entregavel_id", entregavelIds)
        .returns<Item[]>()
    : { data: [] as Item[] };
  const itens = itensData ?? [];

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-6 py-10">
      <h1 className="text-2xl font-semibold">Ritual do mês</h1>

      {checkpoints.length > 0 && (
        <section className="border-signature bg-signature/10 rounded-md border px-4 py-3">
          <h2 className="text-signature-foreground text-sm font-medium">
            Checkpoint deste mês
          </h2>
          <ul className="mt-1 space-y-1 text-sm">
            {checkpoints.map((cp) => (
              <li key={cp.id}>{cp.descricao ?? "Replanejamento previsto"}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium">
          Fechamento do mês anterior
        </h2>
        {progressoAnterior.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum entregável no mês anterior.
          </p>
        ) : (
          <ul className="space-y-2">
            {progressoAnterior.map((p) => (
              <li
                key={p.entregavel_id}
                className="border-border flex items-center justify-between rounded-md border px-4 py-2 text-sm"
              >
                <span>{p.titulo}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {p.itens_concluidos}/{p.itens_totais}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Entregáveis deste mês</h2>

        <ul className="mb-4 space-y-3">
          {progressoAtual.map((p) => (
            <li key={p.entregavel_id} className="border-border rounded-md border px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{p.titulo}</span>
                {p.estado === "planejado" ? (
                  <form action={confirmEntregavel.bind(null, p.entregavel_id)}>
                    <button
                      type="submit"
                      className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs"
                    >
                      Confirmar
                    </button>
                  </form>
                ) : (
                  <span className="text-muted-foreground font-mono text-xs">
                    {p.itens_concluidos}/{p.itens_totais}
                  </span>
                )}
              </div>

              {p.estado !== "planejado" && (
                <div className="mt-3 space-y-2">
                  {itens
                    .filter((i) => i.entregavel_id === p.entregavel_id)
                    .map((i) => (
                      <p key={i.id} className="text-muted-foreground text-xs">
                        · {i.titulo}
                      </p>
                    ))}
                  <form action={createItens} className="flex gap-2">
                    <input type="hidden" name="entregavel_id" value={p.entregavel_id} />
                    <textarea
                      name="titulos"
                      rows={2}
                      placeholder={"Um item por linha — cole vários de uma vez"}
                      className="border-input flex-1 rounded-md border bg-transparent px-2 py-1 text-xs"
                    />
                    <button
                      type="submit"
                      className="border-border self-start rounded-md border px-2 py-1 text-xs"
                    >
                      Adicionar
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
          {progressoAtual.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Nenhum entregável para este mês ainda.
            </p>
          )}
        </ul>

        {metas.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Crie uma meta ativa em Ano/Metas antes de criar entregáveis.
          </p>
        ) : (
          <form action={createEntregavel} className="flex gap-2">
            <select
              name="meta_id"
              required
              className="border-input rounded-md border bg-transparent px-2 py-2 text-sm"
            >
              {metas.map((meta) => (
                <option key={meta.id} value={meta.id}>
                  {meta.titulo}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="titulo"
              required
              placeholder="Novo entregável"
              className="border-input flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="border-border rounded-md border px-3 py-2 text-sm"
            >
              Criar
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
