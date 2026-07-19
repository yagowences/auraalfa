"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";
import { idleAuthState } from "@/lib/auth-form-state";

export default function EsqueciSenhaPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    idleAuthState,
  );

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Redefinir senha</h1>
          <p className="text-muted-foreground text-sm">
            Enviamos um link para você escolher uma nova senha.
          </p>
        </div>

        {state.status === "success" ? (
          <p className="text-sm">{state.message}</p>
        ) : (
          <form action={formAction} className="space-y-3">
            <input
              type="email"
              name="email"
              required
              placeholder="voce@exemplo.com"
              className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-primary-foreground w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar link"}
            </button>
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
