"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthFormState } from "@/lib/auth-form-state";

export async function updatePassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = formData.get("password");
  const confirmar = formData.get("confirmar");

  if (typeof password !== "string" || password.length < 8) {
    return { status: "error", message: "A senha precisa de pelo menos 8 caracteres." };
  }
  if (password !== confirmar) {
    return { status: "error", message: "As senhas não coincidem." };
  }

  const supabase = await createClient();

  // A sessão de recuperação já foi criada pelo /auth/callback (que trocou
  // o code do link de e-mail por uma sessão). Sem sessão, não tem o que
  // atualizar.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message: "Link expirado. Peça um novo em \"Esqueci minha senha\".",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/");
}
