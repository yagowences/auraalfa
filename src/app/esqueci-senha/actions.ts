"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { AuthFormState } from "@/lib/auth-form-state";

export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.includes("@")) {
    return { status: "error", message: "E-mail inválido." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  // Não confirma nem nega se o e-mail existe — evita enumeração de contas.
  return {
    status: "success",
    message: "Se esse e-mail tiver conta, enviamos um link para redefinir a senha.",
  };
}
