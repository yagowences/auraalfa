import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Meta } from "@/lib/types";
import { createMeta, toggleMetaAtiva, deleteMeta } from "./actions";

export default async function MetasPage() {
  const supabase = await createClient();
  const { data: metas } = await supabase
    .from("metas")
    .select("*")
    .order("ativa", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<Meta[]>();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Ano / Metas</h1>

      <form action={createMeta} className="mb-10 space-y-3">
        <input
          type="text"
          name="titulo"
          required
          placeholder="Título da meta"
          className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm"
        />
        <textarea
          name="descricao"
          placeholder="Descrição (opcional)"
          rows={2}
          className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-3">
          <label className="text-muted-foreground text-sm">
            Data alvo
            <input
              type="date"
              name="data_alvo"
              className="border-input ml-2 rounded-md border bg-transparent px-2 py-1 text-sm"
            />
          </label>
          <button
            type="submit"
            className="bg-primary text-primary-foreground ml-auto rounded-md px-3 py-2 text-sm font-medium"
          >
            Criar meta
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {metas?.map((meta) => (
          <li
            key={meta.id}
            className="border-border flex items-center gap-3 rounded-md border px-4 py-3"
          >
            <form
              action={toggleMetaAtiva.bind(null, meta.id, !meta.ativa)}
            >
              <button
                type="submit"
                title={meta.ativa ? "Marcar como inativa" : "Marcar como ativa"}
                className={
                  meta.ativa
                    ? "h-2.5 w-2.5 rounded-full bg-primary"
                    : "h-2.5 w-2.5 rounded-full border border-muted-foreground"
                }
              />
            </form>
            <Link href={`/metas/${meta.id}`} className="flex-1">
              <p className="text-sm font-medium">{meta.titulo}</p>
              {meta.data_alvo && (
                <p className="text-muted-foreground text-xs">
                  até {meta.data_alvo}
                </p>
              )}
            </Link>
            <form action={deleteMeta.bind(null, meta.id)}>
              <button
                type="submit"
                className="text-muted-foreground hover:text-destructive text-xs"
              >
                Excluir
              </button>
            </form>
          </li>
        ))}
        {metas?.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nenhuma meta ainda. Crie a primeira acima.
          </p>
        )}
      </ul>
    </main>
  );
}
