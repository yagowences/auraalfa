"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const habitoSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(200),
  meta_semanal: z.coerce.number().int().min(1).max(7),
});

export async function createHabito(formData: FormData) {
  const user = await requireUser();

  const parsed = habitoSchema.safeParse({
    nome: formData.get("nome"),
    meta_semanal: formData.get("meta_semanal") || 7,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("habitos").insert({
    usuario_id: user.id,
    nome: parsed.data.nome,
    meta_semanal: parsed.data.meta_semanal,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/habitos");
}

export async function toggleHabitoAtivo(id: string, ativo: boolean) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("habitos").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/habitos");
}

const compromissoSchema = z.object({
  titulo: z.string().trim().min(1, "Título obrigatório").max(200),
  dia_semana: z.coerce.number().int().min(0).max(6),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
});

export async function createCompromisso(formData: FormData) {
  const user = await requireUser();

  const parsed = compromissoSchema.safeParse({
    titulo: formData.get("titulo"),
    dia_semana: formData.get("dia_semana"),
    hora_inicio: formData.get("hora_inicio"),
    hora_fim: formData.get("hora_fim"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }
  if (parsed.data.hora_fim <= parsed.data.hora_inicio) {
    throw new Error("Hora de fim precisa ser depois da hora de início");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("compromissos_fixos").insert({
    usuario_id: user.id,
    titulo: parsed.data.titulo,
    dia_semana: parsed.data.dia_semana,
    hora_inicio: parsed.data.hora_inicio,
    hora_fim: parsed.data.hora_fim,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/habitos");
}

export async function deleteCompromisso(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("compromissos_fixos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/habitos");
}
