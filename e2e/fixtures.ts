import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente autenticado direto (anon key + login), usado nos testes só pra
// semear/limpar dado que a UI não alcança (ex.: seleção de semana
// anterior — não dá pra esperar uma semana real rodar o teste).
export async function testSupabase(): Promise<{
  supabase: SupabaseClient;
  usuarioId: string;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  });
  if (error || !data.user) throw error ?? new Error("login de teste falhou");
  return { supabase, usuarioId: data.user.id };
}

export function weekStart(offsetWeeks = 0): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const d = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday + offsetWeeks * 7,
    ),
  );
  return d.toISOString().slice(0, 10);
}

export function monthStart(offsetMonths = 0): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
  return d.toISOString().slice(0, 10);
}
