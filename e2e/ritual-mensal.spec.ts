import { test, expect } from "@playwright/test";
import { testSupabase, monthStart } from "./fixtures";

// Seção 5 da doc: entregável nasce "planejado" quando pré-criado, e só
// vira "confirmado" no ritual mensal — nunca automaticamente.
test.describe("ritual do mês", () => {
  let metaId: string;

  test.beforeEach(async () => {
    const { supabase, usuarioId } = await testSupabase();

    const { data: meta, error: metaErr } = await supabase
      .from("metas")
      .insert({ titulo: `E2E mes ${Date.now()}`, usuario_id: usuarioId })
      .select()
      .single();
    if (metaErr) throw metaErr;
    metaId = meta.id;

    // Simula um entregável pré-criado (origem = pre_criado), que nasce
    // "planejado" por padrão — a UI ainda não tem essa tela de pré-criação,
    // então semear direto é o único jeito de testar o caminho de confirmação.
    const { error: entErr } = await supabase.from("entregaveis_mensais").insert({
      meta_id: metaId,
      mes: monthStart(),
      titulo: "Entregável pré-criado E2E",
      origem: "pre_criado",
    });
    if (entErr) throw entErr;
  });

  test.afterEach(async () => {
    const { supabase } = await testSupabase();
    if (metaId) await supabase.from("metas").delete().eq("id", metaId);
  });

  test("entregável planejado precisa de confirmação explícita no ritual", async ({
    page,
  }) => {
    await page.goto("/mes");

    const linha = page.locator("li", { hasText: "Entregável pré-criado E2E" });
    await expect(linha).toBeVisible();
    await expect(linha.getByRole("button", { name: "Confirmar" })).toBeVisible();

    await linha.getByRole("button", { name: "Confirmar" }).click();

    await expect(linha.getByRole("button", { name: "Confirmar" })).not.toBeVisible();
    await expect(linha.getByText("0/0")).toBeVisible();
  });
});
