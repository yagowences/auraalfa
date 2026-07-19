"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Proposta = { itemId: string; data: string; horaInicio: string; horaFim: string; titulo: string };
type ItemNaoCoube = { id: string; titulo: string };

export default function AgendamentoPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<{
    propostas: Proposta[];
    itensNaoCoubem: ItemNaoCoube[];
  } | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  async function sugerir() {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/agendamento/sugestao", { method: "POST" });
      if (!res.ok) throw new Error("Não foi possível gerar a sugestão.");
      const data = await res.json();
      setResultado(data);
      setSelecionados(new Set(data.propostas.map((_: Proposta, i: number) => i)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }

  async function confirmar() {
    if (!resultado) return;
    setConfirmando(true);
    setErro(null);
    try {
      const propostasAceitas = resultado.propostas.filter((_, i) => selecionados.has(i));
      const res = await fetch("/api/agendamento/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propostas: propostasAceitas }),
      });
      if (!res.ok) throw new Error("Não foi possível confirmar a agenda.");
      router.push("/");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setConfirmando(false);
    }
  }

  function toggle(i: number) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(i)) novo.delete(i);
      else novo.add(i);
      return novo;
    });
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Sugerir agenda da semana</h1>

      {!resultado && (
        <button
          type="button"
          onClick={sugerir}
          disabled={carregando}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {carregando ? "Calculando…" : "Sugerir agenda"}
        </button>
      )}

      {erro && <p className="text-destructive text-sm">{erro}</p>}

      {resultado && (
        <>
          <section>
            <h2 className="mb-3 text-sm font-medium">
              Proposta ({resultado.propostas.length})
            </h2>
            {resultado.propostas.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nada pra sugerir.</p>
            ) : (
              <ul className="space-y-2">
                {resultado.propostas.map((p, i) => (
                  <li
                    key={`${p.itemId}-${i}`}
                    className="border-border flex items-center gap-3 rounded-md border px-4 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selecionados.has(i)}
                      onChange={() => toggle(i)}
                    />
                    <span className="text-muted-foreground font-mono text-xs">
                      {p.data} {p.horaInicio}–{p.horaFim}
                    </span>
                    <span>{p.titulo}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {resultado.itensNaoCoubem.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium">Não coube na semana</h2>
              <ul className="space-y-1">
                {resultado.itensNaoCoubem.map((item) => (
                  <li key={item.id} className="text-muted-foreground text-sm">
                    {item.titulo}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={confirmar}
              disabled={confirmando || selecionados.size === 0}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {confirmando ? "Confirmando…" : "Confirmar agenda"}
            </button>
            <button
              type="button"
              onClick={sugerir}
              disabled={carregando}
              className="border-border rounded-md border px-4 py-2 text-sm"
            >
              Recalcular
            </button>
          </div>
        </>
      )}
    </main>
  );
}
