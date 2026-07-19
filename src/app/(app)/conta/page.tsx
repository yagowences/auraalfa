"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/redefinir-senha/actions";
import { idleAuthState } from "@/lib/auth-form-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Também serve pra migrar as contas criadas antes da troca de magic link
// pra senha (essas não têm senha nenhuma ainda até passar por aqui).
export default function ContaPage() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    idleAuthState,
  );

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Conta</h1>

      <form action={formAction} className="flex flex-col gap-3">
        <Label htmlFor="password">Definir/alterar senha</Label>
        <Input
          id="password"
          type="password"
          name="password"
          required
          minLength={8}
          placeholder="Nova senha (mín. 8 caracteres)"
        />
        <Input
          type="password"
          name="confirmar"
          required
          placeholder="Confirmar nova senha"
          aria-label="Confirmar nova senha"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
        {state.status === "error" && (
          <p className="text-destructive text-sm">{state.message}</p>
        )}
      </form>
    </main>
  );
}
