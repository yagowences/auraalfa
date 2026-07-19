import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Meta, Fase, Checkpoint, ProgressoEntregavel } from "@/lib/types";
import {
  createFase,
  deleteFase,
  createCheckpoint,
  deleteCheckpoint,
} from "./actions";

export default async function MetaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [metaResult, fasesResult, checkpointsResult, progressoResult] =
    await Promise.all([
      supabase.from("metas").select("*").eq("id", id).single<Meta>(),
      supabase
        .from("fases")
        .select("*")
        .eq("meta_id", id)
        .order("ordem")
        .returns<Fase[]>(),
      supabase
        .from("checkpoints")
        .select("*")
        .eq("meta_id", id)
        .order("mes_gatilho")
        .returns<Checkpoint[]>(),
      supabase
        .from("progresso_entregaveis")
        .select("*")
        .eq("meta_id", id)
        .order("mes")
        .returns<ProgressoEntregavel[]>(),
    ]);

  if (!metaResult.data) notFound();

  const meta = metaResult.data;
  const fases = fasesResult.data ?? [];
  const checkpoints = checkpointsResult.data ?? [];
  const progresso = progressoResult.data ?? [];

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">{meta.titulo}</h1>
        {meta.descricao && (
          <p className="text-muted-foreground mt-1 text-sm">
            {meta.descricao}
          </p>
        )}
        {meta.data_alvo && (
          <p className="text-muted-foreground mt-1 text-sm">
            Alvo: {meta.data_alvo}
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium">Entregáveis mensais</h2>
        {progresso.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum entregável ainda — eles nascem no ritual do mês.
          </p>
        ) : (
          <ul className="space-y-2">
            {progresso.map((p) => (
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
        <h2 className="mb-3 text-sm font-medium">Fases</h2>
        <ul className="mb-3 space-y-2">
          {fases.map((fase) => (
            <li
              key={fase.id}
              className="border-border flex items-center justify-between rounded-md border px-4 py-2 text-sm"
            >
              <span>{fase.nome}</span>
              <form action={deleteFase.bind(null, id, fase.id)}>
                <button
                  type="submit"
                  className="text-muted-foreground hover:text-destructive text-xs"
                >
                  Excluir
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form
          action={createFase.bind(null, id)}
          className="flex gap-2"
        >
          <input
            type="text"
            name="nome"
            required
            placeholder="Nome da fase"
            className="border-input flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            Adicionar
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Checkpoints</h2>
        <ul className="mb-3 space-y-2">
          {checkpoints.map((cp) => (
            <li
              key={cp.id}
              className="border-border flex items-center justify-between rounded-md border px-4 py-2 text-sm"
            >
              <span>
                {cp.mes_gatilho}
                {cp.descricao ? ` — ${cp.descricao}` : ""}
              </span>
              <form action={deleteCheckpoint.bind(null, id, cp.id)}>
                <button
                  type="submit"
                  className="text-muted-foreground hover:text-destructive text-xs"
                >
                  Excluir
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form
          action={createCheckpoint.bind(null, id)}
          className="flex gap-2"
        >
          <input
            type="date"
            name="mes_gatilho"
            required
            className="border-input rounded-md border bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="text"
            name="descricao"
            placeholder="Descrição (opcional)"
            className="border-input flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            Adicionar
          </button>
        </form>
      </section>
    </main>
  );
}
