"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/redefinir-senha/actions";
import { idleAuthState } from "@/lib/auth-form-state";

// Também serve pra migrar as contas criadas antes da troca de magic link
// pra senha (essas não têm senha nenhuma ainda até passar por aqui).
export default function ContaPage() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    idleAuthState,
  );

  return (
    <main className="mx-auto max-w-sm space-y-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Conta</h1>

      <form action={formAction} className="space-y-3">
        <label className="text-sm font-medium">Definir/alterar senha</label>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          placeholder="Nova senha (mín. 8 caracteres)"
          className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm"
        />
        <input
          type="password"
          name="confirmar"
          required
          placeholder="Confirmar nova senha"
          className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {state.status === "error" && (
          <p className="text-destructive text-sm">{state.message}</p>
        )}
      </form>
    </main>
  );
}
