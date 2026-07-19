import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Meta, Fase, Checkpoint, ProgressoEntregavel } from "@/lib/types";
import {
  createFase,
  deleteFase,
  createCheckpoint,
  deleteCheckpoint,
} from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-10">
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
          <ul className="flex flex-col gap-2">
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
        <ul className="mb-3 flex flex-col gap-2">
          {fases.map((fase) => (
            <li
              key={fase.id}
              className="border-border flex items-center justify-between rounded-md border px-4 py-2 text-sm"
            >
              <span>{fase.nome}</span>
              <form action={deleteFase.bind(null, id, fase.id)}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                >
                  Excluir
                </Button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createFase.bind(null, id)} className="flex gap-2">
          <Input
            type="text"
            name="nome"
            required
            placeholder="Nome da fase"
            className="flex-1"
          />
          <Button type="submit" variant="outline">
            Adicionar
          </Button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Checkpoints</h2>
        <ul className="mb-3 flex flex-col gap-2">
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
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                >
                  Excluir
                </Button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createCheckpoint.bind(null, id)} className="flex gap-2">
          <Input
            type="date"
            name="mes_gatilho"
            required
            aria-label="Mês do checkpoint"
            className="w-auto"
          />
          <Input
            type="text"
            name="descricao"
            placeholder="Descrição (opcional)"
            className="flex-1"
          />
          <Button type="submit" variant="outline">
            Adicionar
          </Button>
        </form>
      </section>
    </main>
  );
}
