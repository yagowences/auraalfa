"use client";

import { useActionState } from "react";
import { updatePassword } from "./actions";
import { idleAuthState } from "@/lib/auth-form-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RedefinirSenhaPage() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    idleAuthState,
  );

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Escolha uma nova senha</h1>
        </div>

        <form action={formAction} className="flex flex-col gap-3">
          <Input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="Nova senha (mín. 8 caracteres)"
            aria-label="Nova senha"
          />
          <Input
            type="password"
            name="confirmar"
            required
            placeholder="Confirmar nova senha"
            aria-label="Confirmar nova senha"
          />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando…" : "Salvar nova senha"}
          </Button>
          {state.status === "error" && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
        </form>
      </div>
    </main>
  );
}
