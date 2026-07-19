import { test, expect } from "@playwright/test";
import { testSupabase, weekStart, monthStart } from "./fixtures";

// Seção 7 da doc: "o motor não força encaixe ruim — retorna também a
// lista de itens que não couberam". Item com duração absurda garante que
// não cabe em nenhuma semana, sem precisar mexer em compromissos/janela.
test.describe("motor de agendamento", () => {
  let metaId: string;

  test.beforeEach(async () => {
    const { supabase, usuarioId } = await testSupabase();

    const { data: meta, error: metaErr } = await supabase
      .from("metas")
      .insert({ titulo: `E2E agendamento ${Date.now()}`, usuario_id: usuarioId })
      .select()
      .single();
    if (metaErr) throw metaErr;
    metaId = meta.id;

    const { data: entregavel, error: entErr } = await supabase
      .from("entregaveis_mensais")
      .insert({
        meta_id: metaId,
        mes: monthStart(),
        titulo: "Entregável E2E agendamento",
        estado: "confirmado",
        origem: "criado_no_ritual",
      })
      .select()
      .single();
    if (entErr) throw entErr;

    const { data: item, error: itemErr } = await supabase
      .from("itens")
      .insert({
        entregavel_id: entregavel.id,
        titulo: "Item impossível de agendar E2E",
        duracao_estimada_min: 999999,
      })
      .select()
      .single();
    if (itemErr) throw itemErr;

    const { error: selErr } = await supabase
      .from("selecoes_semanais")
      .insert({ item_id: item.id, semana_referencia: weekStart(0) });
    if (selErr) throw selErr;
  });

  test.afterEach(async () => {
    const { supabase } = await testSupabase();
    if (metaId) await supabase.from("metas").delete().eq("id", metaId);
  });

  test('item que não cabe em nenhum slot da semana aparece em "não coube"', async ({
    page,
  }) => {
    await page.goto("/agendamento");
    await page.getByRole("button", { name: "Sugerir agenda" }).click();

    await expect(page.getByText("Não coube na semana")).toBeVisible();
    await expect(page.getByText("Item impossível de agendar E2E")).toBeVisible();
  });
});
