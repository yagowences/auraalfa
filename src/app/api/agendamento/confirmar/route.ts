import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { weekStart } from "@/lib/dates";

const blocoSchema = z.object({
  itemId: z.string().uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/),
});
const bodySchema = z.object({ propostas: z.array(blocoSchema) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const semanaReferencia = weekStart(0);
  const itemIds = Array.from(new Set(parsed.data.propostas.map((p) => p.itemId)));

  if (itemIds.length > 0) {
    // Limpa sugestões antigas desses itens pra essa semana antes de gravar
    // as novas — evita acumular blocos duplicados quando o usuário roda
    // "sugerir agenda" mais de uma vez. Nunca toca em fixado_manual.
    const { error: delError } = await supabase
      .from("blocos_agendados")
      .delete()
      .eq("semana_referencia", semanaReferencia)
      .eq("origem_bloco", "sugerido")
      .in("item_id", itemIds);
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }
  }

  if (parsed.data.propostas.length > 0) {
    const { error } = await supabase.from("blocos_agendados").insert(
      parsed.data.propostas.map((p) => ({
        item_id: p.itemId,
        semana_referencia: semanaReferencia,
        data: p.data,
        hora_inicio: p.horaInicio,
        hora_fim: p.horaFim,
        origem_bloco: "sugerido" as const,
      })),
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
