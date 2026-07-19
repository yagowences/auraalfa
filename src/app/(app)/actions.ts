"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function toggleItemStatus(itemId: string, concluido: boolean) {
  await requireUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from("itens")
    .update({ status: concluido ? "concluido" : "aberto" })
    .eq("id", itemId);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function agendarParaHoje(itemId: string, semanaReferencia: string) {
  await requireUser();

  const hoje = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  // Atalho manual (sem hora — só data) até o motor da Fase 2 assumir esse
  // botão. fixado_manual porque foi uma escolha explícita do usuário, não
  // sugestão do motor — recálculos futuros não devem mexer nisso.
  const { error } = await supabase.from("blocos_agendados").insert({
    item_id: itemId,
    semana_referencia: semanaReferencia,
    data: hoje,
    origem_bloco: "fixado_manual",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function toggleHabitoHoje(habitoId: string, jaFeitoHoje: boolean) {
  await requireUser();

  const hoje = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  if (jaFeitoHoje) {
    const { error } = await supabase
      .from("logs_habitos")
      .delete()
      .eq("habito_id", habitoId)
      .eq("data", hoje);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("logs_habitos")
      .insert({ habito_id: habitoId, data: hoje, concluido: true });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}
