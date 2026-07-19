"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const faseSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(200),
});

export async function createFase(metaId: string, formData: FormData) {
  await requireUser();

  const parsed = faseSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("fases")
    .insert({ meta_id: metaId, nome: parsed.data.nome });

  if (error) throw new Error(error.message);
  revalidatePath(`/metas/${metaId}`);
}

export async function deleteFase(metaId: string, faseId: string) {
  await requireUser();

  const supabase = await createClient();
  const { error } = await supabase.from("fases").delete().eq("id", faseId);

  if (error) throw new Error(error.message);
  revalidatePath(`/metas/${metaId}`);
}

const checkpointSchema = z.object({
  mes_gatilho: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  descricao: z.string().trim().max(2000).optional(),
});

export async function createCheckpoint(metaId: string, formData: FormData) {
  await requireUser();

  const parsed = checkpointSchema.safeParse({
    mes_gatilho: formData.get("mes_gatilho"),
    descricao: formData.get("descricao") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("checkpoints").insert({
    meta_id: metaId,
    mes_gatilho: parsed.data.mes_gatilho,
    descricao: parsed.data.descricao || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/metas/${metaId}`);
}

export async function deleteCheckpoint(metaId: string, checkpointId: string) {
  await requireUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from("checkpoints")
    .delete()
    .eq("id", checkpointId);

  if (error) throw new Error(error.message);
  revalidatePath(`/metas/${metaId}`);
}
