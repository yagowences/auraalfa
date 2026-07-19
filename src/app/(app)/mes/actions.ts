"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthStart } from "@/lib/dates";

export async function confirmEntregavel(entregavelId: string) {
  await requireUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from("entregaveis_mensais")
    .update({ estado: "confirmado" })
    .eq("id", entregavelId)
    .eq("estado", "planejado");

  if (error) throw new Error(error.message);
  revalidatePath("/mes");
}

const createEntregavelSchema = z.object({
  meta_id: z.string().uuid(),
  titulo: z.string().trim().min(1, "Título obrigatório").max(200),
});

export async function createEntregavel(formData: FormData) {
  await requireUser();

  const parsed = createEntregavelSchema.safeParse({
    meta_id: formData.get("meta_id"),
    titulo: formData.get("titulo"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const supabase = await createClient();
  // Nascido no ritual = já é uma decisão deliberada tomada agora, não
  // precisa do passo extra de confirmação que os pré-criados precisam.
  const { error } = await supabase.from("entregaveis_mensais").insert({
    meta_id: parsed.data.meta_id,
    mes: monthStart(),
    titulo: parsed.data.titulo,
    estado: "confirmado",
    origem: "criado_no_ritual",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/mes");
}

const createItensSchema = z.object({
  entregavel_id: z.string().uuid(),
  titulos: z.string().trim().min(1, "Adicione ao menos um item"),
});

export async function createItens(formData: FormData) {
  await requireUser();

  const parsed = createItensSchema.safeParse({
    entregavel_id: formData.get("entregavel_id"),
    titulos: formData.get("titulos"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const linhas = parsed.data.titulos
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

  if (linhas.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.from("itens").insert(
    linhas.map((titulo) => ({
      entregavel_id: parsed.data.entregavel_id,
      titulo,
    })),
  );

  if (error) throw new Error(error.message);
  revalidatePath("/mes");
}
