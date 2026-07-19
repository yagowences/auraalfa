import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "./actions";
import { Button } from "@/components/ui/button";

// Nav de 3 itens só (Hoje / Ano-Metas / Hábitos) — Semana e Mês não entram
// aqui de propósito. Eles se anunciam como banner contextual em "Hoje"
// quando devidos, não como item de menu que o usuário precisa lembrar de
// visitar (ver "Desenho de UX" do plano).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-svh">
      <aside className="border-border flex w-56 shrink-0 flex-col justify-between border-r px-4 py-6">
        <div className="flex flex-col gap-6">
          <p className="font-heading text-lg font-semibold">Aura Alfa</p>
          <nav className="flex flex-col gap-1 text-sm">
            <Link
              href="/"
              className="rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
            >
              Hoje
            </Link>
            <Link
              href="/metas"
              className="rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
            >
              Ano / Metas
            </Link>
            <Link
              href="/habitos"
              className="rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
            >
              Hábitos
            </Link>
          </nav>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="/conta"
            className="text-muted-foreground hover:text-foreground block truncate text-xs"
          >
            {user.email}
          </Link>
          <form action={signOut}>
            <Button
              type="submit"
              variant="link"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-auto p-0"
            >
              Sair
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
