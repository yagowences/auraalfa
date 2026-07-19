import { test, expect } from "@playwright/test";
import { testSupabase, weekStart, monthStart } from "./fixtures";

// A regra mais crítica do produto (doc original, seção 5): o bloco 2 da
// Semana não pode abrir enquanto existir item da semana anterior sem
// decisão de rollover. É "regra de fluxo de tela, não de banco" — só um
// teste de UI pega uma regressão aqui.
test.describe("gate de rollover da Semana", () => {
  let metaId: string;
  let itemId: string;

  test.beforeEach(async () => {
    const { supabase, usuarioId } = await testSupabase();

    const { data: meta, error: metaErr } = await supabase
      .from("metas")
      .insert({ titulo: `E2E rollover ${Date.now()}`, usuario_id: usuarioId })
      .select()
      .single();
    if (metaErr) throw metaErr;
    metaId = meta.id;

    const { data: entregavel, error: entErr } = await supabase
      .from("entregaveis_mensais")
      .insert({
        meta_id: metaId,
        mes: monthStart(),
        titulo: "Entregável E2E",
        estado: "confirmado",
        origem: "criado_no_ritual",
      })
      .select()
      .single();
    if (entErr) throw entErr;

    const { data: item, error: itemErr } = await supabase
      .from("itens")
      .insert({ entregavel_id: entregavel.id, titulo: "Item pendente E2E" })
      .select()
      .single();
    if (itemErr) throw itemErr;
    itemId = item.id;

    // O item "ficou" selecionado na semana passada e nunca foi decidido —
    // exatamente o cenário que o bloco 1 precisa capturar.
    const { error: selErr } = await supabase
      .from("selecoes_semanais")
      .insert({ item_id: itemId, semana_referencia: weekStart(-1) });
    if (selErr) throw selErr;
  });

  test.afterEach(async () => {
    const { supabase } = await testSupabase();
    if (metaId) await supabase.from("metas").delete().eq("id", metaId);
  });

  test("bloco 2 trava até o bloco 1 esvaziar, e libera ao decidir o rollover", async ({
    page,
  }) => {
    await page.goto("/semana");

    // O item pendente também aparece (travado) na lista de seleção do
    // bloco 2, porque a doc define a elegibilidade só por status do item
    // + estado do entregável — não exclui quem ainda não teve o rollover
    // decidido. Por isso os locators abaixo são escopados por bloco.
    const bloco1 = page.locator("section", {
      has: page.getByRole("heading", { name: /Decidir o que ficou pra trás/ }),
    });
    const bloco2 = page.locator("section", {
      has: page.getByRole("heading", { name: /Escolher a semana/ }),
    });

    await expect(bloco1.getByText("Item pendente E2E")).toBeVisible();
    await expect(bloco2).toHaveClass(/pointer-events-none/);
    await expect(page.getByText("🔒 resolva o bloco 1")).toBeVisible();

    await bloco1.getByRole("button", { name: "→ Próxima semana" }).click();

    await expect(page.getByText("Tudo decidido.")).toBeVisible();
    await expect(bloco2).not.toHaveClass(/pointer-events-none/);
    await expect(page.getByText("🔒 resolva o bloco 1")).not.toBeVisible();
  });
});
