"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "./actions";
import { idleAuthState } from "@/lib/auth-form-state";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, idleAuthState);

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Aura Alfa</h1>
          <p className="text-muted-foreground text-sm">
            Entre com seu e-mail e senha.
          </p>
        </div>

        <form action={formAction} className="space-y-3">
          <input
            type="email"
            name="email"
            required
            placeholder="voce@exemplo.com"
            className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            type="password"
            name="password"
            required
            placeholder="Senha"
            className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-primary-foreground w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
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
