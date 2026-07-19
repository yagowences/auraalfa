"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "./actions";
import { idleAuthState } from "@/lib/auth-form-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, idleAuthState);

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Aura Alfa</h1>
          <p className="text-muted-foreground text-sm">
            Entre com seu e-mail e senha.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-3">
          <Input
            type="email"
            name="email"
            required
            placeholder="voce@exemplo.com"
            aria-label="E-mail"
          />
          <Input
            type="password"
            name="password"
            required
            placeholder="Senha"
            aria-label="Senha"
          />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Entrando…" : "Entrar"}
          </Button>
          {state.status === "error" && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
        </form>

        <div className="text-muted-foreground flex justify-between text-xs">
          <Link href="/cadastro" className="hover:text-foreground underline">
            Criar conta
          </Link>
          <Link
            href="/esqueci-senha"
            className="hover:text-foreground underline"
          >
            Esqueci minha senha
          </Link>
        </div>
      </div>
    </main>
  );
}
