"use client";

import { useActionState } from "react";
import { updatePassword } from "./actions";
import { idleAuthState } from "@/lib/auth-form-state";

export default function RedefinirSenhaPage() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    idleAuthState,
  );

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Escolha uma nova senha</h1>
        </div>

        <form action={formAction} className="space-y-3">
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="Nova senha (mín. 8 caracteres)"
            className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            type="password"
            name="confirmar"
            required
            placeholder="Confirmar nova senha"
            className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-primary-foreground w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {pending ? "Salvando…" : "Salvar nova senha"}
          </button>
          {state.status === "error" && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
        </form>
      </div>
    </main>
  );
}
