import { createClient } from "@/lib/supabase/server";
import { monthStart } from "@/lib/dates";
import type { Meta, Checkpoint, ProgressoEntregavel } from "@/lib/types";
import { confirmEntregavel, createEntregavel, createItens } from "./actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-10">
      <h1 className="text-2xl font-semibold">Ritual do mês</h1>

      {checkpoints.length > 0 && (
        <section className="border-signature bg-signature/10 rounded-md border px-4 py-3">
          <h2 className="text-signature-foreground text-sm font-medium">
            Checkpoint deste mês
          </h2>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
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
          <ul className="flex flex-col gap-2">
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

        <ul className="mb-4 flex flex-col gap-3">
          {progressoAtual.map((p) => (
            <li key={p.entregavel_id} className="border-border rounded-md border px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{p.titulo}</span>
                {p.estado === "planejado" ? (
                  <form action={confirmEntregavel.bind(null, p.entregavel_id)}>
                    <Button type="submit" size="sm">
                      Confirmar
                    </Button>
                  </form>
                ) : (
                  <span className="text-muted-foreground font-mono text-xs">
                    {p.itens_concluidos}/{p.itens_totais}
                  </span>
                )}
              </div>

              {p.estado !== "planejado" && (
                <div className="mt-3 flex flex-col gap-2">
                  {itens
                    .filter((i) => i.entregavel_id === p.entregavel_id)
                    .map((i) => (
                      <p key={i.id} className="text-muted-foreground text-xs">
                        · {i.titulo}
                      </p>
                    ))}
                  <form action={createItens} className="flex gap-2">
                    <input type="hidden" name="entregavel_id" value={p.entregavel_id} />
                    <Textarea
                      name="titulos"
                      rows={2}
                      placeholder="Um item por linha — cole vários de uma vez"
                      className="flex-1 text-xs"
                    />
                    <Button type="submit" variant="outline" size="sm" className="self-start">
                      Adicionar
                    </Button>
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
            <Select name="meta_id" defaultValue={metas[0].id}>
              <SelectTrigger aria-label="Meta">
                <SelectValue placeholder="Meta" />
              </SelectTrigger>
              <SelectContent>
                {metas.map((meta) => (
                  <SelectItem key={meta.id} value={meta.id}>
                    {meta.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="text"
              name="titulo"
              required
              placeholder="Novo entregável"
              className="flex-1"
            />
            <Button type="submit" variant="outline">
              Criar
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
