import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server Actions são endpoint público de fato (skill vercel-react-best-
// practices, regra 3.1) — nunca confiar só no middleware. Toda action que
// escreve dado chama isso primeiro.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
