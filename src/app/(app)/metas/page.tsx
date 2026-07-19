import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Meta } from "@/lib/types";
import { createMeta, toggleMetaAtiva, deleteMeta } from "./actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

      <form action={createMeta} className="mb-10 flex flex-col gap-3">
        <Input type="text" name="titulo" required placeholder="Título da meta" />
        <Textarea name="descricao" placeholder="Descrição (opcional)" rows={2} />
        <div className="flex items-center gap-3">
          <Label htmlFor="data_alvo" className="text-muted-foreground">
            Data alvo
          </Label>
          <Input id="data_alvo" type="date" name="data_alvo" className="w-auto" />
          <Button type="submit" className="ml-auto">
            Criar meta
          </Button>
        </div>
      </form>

      <ul className="flex flex-col gap-2">
        {metas?.map((meta) => (
          <li
            key={meta.id}
            className="border-border flex items-center gap-3 rounded-md border px-4 py-3"
          >
            <form action={toggleMetaAtiva.bind(null, meta.id, !meta.ativa)}>
              <Button
                type="submit"
                variant="ghost"
                size="icon-xs"
                title={meta.ativa ? "Marcar como inativa" : "Marcar como ativa"}
              >
                <span
                  className={
                    meta.ativa
                      ? "size-2.5 rounded-full bg-primary"
                      : "size-2.5 rounded-full border border-muted-foreground"
                  }
                />
              </Button>
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
        {metas?.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nenhuma meta ainda. Crie a primeira acima.
          </p>
        )}
      </ul>
    </main>
  );
}
