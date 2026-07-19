import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { weekStart } from "@/lib/dates";
import { buildEntradaAgendamento } from "@/lib/scheduling/build-entrada";
import { agendar } from "@/lib/scheduling/engine";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const semanaReferencia = weekStart(0);
  const entrada = await buildEntradaAgendamento(supabase, user.id, semanaReferencia);
  const saida = agendar(entrada);

  const idsEnvolvidos = Array.from(
    new Set([...saida.propostas.map((p) => p.itemId), ...saida.itensNaoCoubem]),
  );
  const { data: itens } = idsEnvolvidos.length
    ? await supabase.from("itens").select("id,titulo").in("id", idsEnvolvidos)
    : { data: [] as { id: string; titulo: string }[] };
  const titulos = new Map((itens ?? []).map((i) => [i.id, i.titulo]));

  return NextResponse.json({
    semanaReferencia,
    propostas: saida.propostas.map((p) => ({ ...p, titulo: titulos.get(p.itemId) ?? "" })),
    itensNaoCoubem: saida.itensNaoCoubem.map((id) => ({ id, titulo: titulos.get(id) ?? "" })),
  });
}
