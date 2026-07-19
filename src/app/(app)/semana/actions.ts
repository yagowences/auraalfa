"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const destinoSchema = z.enum(["proxima_semana", "descartado"]);

export async function decidirRollover(
  itemId: string,
  semanaReferencia: string,
  destino: "proxima_semana" | "descartado",
) {
  await requireUser();
  destinoSchema.parse(destino);

  const supabase = await createClient();
  const { error } = await supabase.from("rollovers").insert({
    item_id: itemId,
    semana_referencia: semanaReferencia,
    destino,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/semana");
}

export async function moverTodosProximaSemana(
  itemIds: string[],
  semanaReferencia: string,
) {
  await requireUser();

  if (itemIds.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.from("rollovers").insert(
    itemIds.map((itemId) => ({
      item_id: itemId,
      semana_referencia: semanaReferencia,
      destino: "proxima_semana" as const,
    })),
  );

  if (error) throw new Error(error.message);
  revalidatePath("/semana");
}

export async function selecionarItens(formData: FormData) {
  await requireUser();

  const itemIds = formData.getAll("item_id").filter((v): v is string => typeof v === "string");
  const semanaReferencia = formData.get("semana_referencia");

  if (typeof semanaReferencia !== "string" || itemIds.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.from("selecoes_semanais").insert(
    itemIds.map((itemId) => ({
      item_id: itemId,
      semana_referencia: semanaReferencia,
    })),
  );

  if (error) throw new Error(error.message);
  revalidatePath("/semana");
}
