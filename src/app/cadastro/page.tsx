"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "./actions";
import { idleAuthState } from "@/lib/auth-form-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState(signUp, idleAuthState);

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Criar conta</h1>
          <p className="text-muted-foreground text-sm">Aura Alfa</p>
        </div>

        {state.status === "success" ? (
          <p className="text-sm">{state.message}</p>
        ) : (
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
              minLength={8}
              placeholder="Senha (mín. 8 caracteres)"
              aria-label="Senha"
            />
            <Input
              type="password"
              name="confirmar"
              required
              placeholder="Confirmar senha"
              aria-label="Confirmar senha"
            />
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Criando…" : "Criar conta"}
            </Button>
            {state.status === "error" && (
              <p className="text-destructive text-sm">{state.message}</p>
            )}
          </form>
        )}

        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground block text-center text-xs underline"
        >
          Já tenho conta
        </Link>
      </div>
    </main>
  );
}
