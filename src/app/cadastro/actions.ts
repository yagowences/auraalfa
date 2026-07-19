"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthFormState } from "@/lib/auth-form-state";

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmar = formData.get("confirmar");

  if (typeof email !== "string" || !email.includes("@")) {
    return { status: "error", message: "E-mail inválido." };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { status: "error", message: "A senha precisa de pelo menos 8 caracteres." };
  }
  if (password !== confirmar) {
    return { status: "error", message: "As senhas não coincidem." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  // Se a confirmação de e-mail estiver desligada no projeto Supabase, o
  // signUp já retorna sessão ativa — entra direto. Se estiver ligada,
  // session vem null e o usuário precisa clicar no link de confirmação.
  if (data.session) {
    redirect("/");
  }

  return {
    status: "success",
    message: "Conta criada. Confira seu e-mail para confirmar antes de entrar.",
  };
}
