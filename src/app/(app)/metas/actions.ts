"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const metaSchema = z.object({
  titulo: z.string().trim().min(1, "Título obrigatório").max(200),
  descricao: z.string().trim().max(2000).optional(),
  data_alvo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .optional()
    .or(z.literal("")),
});

export async function createMeta(formData: FormData) {
  const user = await requireUser();

  const parsed = metaSchema.safeParse({
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao") || undefined,
    data_alvo: formData.get("data_alvo") || "",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("metas").insert({
    usuario_id: user.id,
    titulo: parsed.data.titulo,
    descricao: parsed.data.descricao || null,
    data_alvo: parsed.data.data_alvo || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/metas");
}

export async function toggleMetaAtiva(id: string, ativa: boolean) {
  await requireUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from("metas")
    .update({ ativa })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/metas");
}

export async function deleteMeta(id: string) {
  await requireUser();

  const supabase = await createClient();
  const { error } = await supabase.from("metas").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/metas");
}
