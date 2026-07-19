"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";
import { idleAuthState } from "@/lib/auth-form-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EsqueciSenhaPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    idleAuthState,
  );

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Redefinir senha</h1>
          <p className="text-muted-foreground text-sm">
            Enviamos um link para você escolher uma nova senha.
          </p>
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
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Enviando…" : "Enviar link"}
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
          Voltar pro login
        </Link>
      </div>
    </main>
  );
}
