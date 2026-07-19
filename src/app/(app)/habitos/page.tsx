import { createClient } from "@/lib/supabase/server";
import {
  createHabito,
  toggleHabitoAtivo,
  createCompromisso,
  deleteCompromisso,
} from "./actions";

type Habito = { id: string; nome: string; meta_semanal: number; ativo: boolean };
type CompromissoFixo = {
  id: string;
  titulo: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ultimosDias(n: number): string[] {
  const dias: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}

export default async function HabitosPage() {
  const supabase = await createClient();

  const [habitosResult, compromissosResult] = await Promise.all([
    supabase
      .from("habitos")
      .select("id,nome,meta_semanal,ativo")
      .order("created_at")
      .returns<Habito[]>(),
    supabase
      .from("compromissos_fixos")
      .select("id,titulo,dia_semana,hora_inicio,hora_fim")
      .order("dia_semana")
      .order("hora_inicio")
      .returns<CompromissoFixo[]>(),
  ]);

  const habitos = habitosResult.data ?? [];
  const compromissos = compromissosResult.data ?? [];
  const dias = ultimosDias(7);

  const { data: logs } = habitos.length
    ? await supabase
        .from("logs_habitos")
        .select("habito_id,data,concluido")
        .in(
          "habito_id",
          habitos.map((h) => h.id),
        )
        .gte("data", dias[0])
        .eq("concluido", true)
    : { data: [] as { habito_id: string; data: string }[] };

  const logsSet = new Set((logs ?? []).map((l) => `${l.habito_id}:${l.data}`));

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-6 py-10">
      <h1 className="text-2xl font-semibold">Hábitos</h1>

      <section>
        <ul className="mb-4 space-y-2">
          {habitos.map((h) => (
            <li key={h.id} className="border-border rounded-md border px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{h.nome}</span>
                <form action={toggleHabitoAtivo.bind(null, h.id, !h.ativo)}>
                  <button
                    type="submit"
                    className="text-muted-foreground text-xs underline"
                  >
                    {h.ativo ? "Desativar" : "Reativar"}
                  </button>
                </form>
              </div>
              <div className="mt-2 flex gap-1">
                {dias.map((dia) => {
                  const feito = logsSet.has(`${h.id}:${dia}`);
                  return (
                    <span
                      key={dia}
                      title={dia}
                      className={
                        feito
                          ? "bg-success h-3 w-3 rounded-sm"
                          : "bg-muted h-3 w-3 rounded-sm"
                      }
                    />
                  );
                })}
                <span className="text-muted-foreground ml-2 font-mono text-xs">
                  meta {h.meta_semanal}/semana
                </span>
              </div>
            </li>
          ))}
          {habitos.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhum hábito ainda.</p>
          )}
        </ul>

        <form action={createHabito} className="flex gap-2">
          <input
            type="text"
            name="nome"
            required
            placeholder="Novo hábito"
            className="border-input flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="number"
            name="meta_semanal"
            min={1}
            max={7}
            defaultValue={7}
            className="border-input w-20 rounded-md border bg-transparent px-2 py-2 text-sm"
          />
          <button type="submit" className="border-border rounded-md border px-3 py-2 text-sm">
            Criar
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Compromissos fixos</h2>
        <ul className="mb-4 space-y-2">
          {compromissos.map((c) => (
            <li
              key={c.id}
              className="border-border flex items-center justify-between rounded-md border px-4 py-2 text-sm"
            >
              <span>
                {DIAS[c.dia_semana]} {c.hora_inicio.slice(0, 5)}–
                {c.hora_fim.slice(0, 5)} — {c.titulo}
              </span>
              <form action={deleteCompromisso.bind(null, c.id)}>
                <button
                  type="submit"
                  className="text-muted-foreground hover:text-destructive text-xs"
                >
                  Excluir
                </button>
              </form>
            </li>
          ))}
          {compromissos.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhum compromisso fixo.</p>
          )}
        </ul>

        <form action={createCompromisso} className="flex flex-wrap gap-2">
          <select
            name="dia_semana"
            className="border-input rounded-md border bg-transparent px-2 py-2 text-sm"
          >
            {DIAS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="time"
            name="hora_inicio"
            required
            className="border-input rounded-md border bg-transparent px-2 py-2 text-sm"
          />
          <input
            type="time"
            name="hora_fim"
            required
            className="border-input rounded-md border bg-transparent px-2 py-2 text-sm"
          />
          <input
            type="text"
            name="titulo"
            required
            placeholder="Título"
            className="border-input flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
          />
          <button type="submit" className="border-border rounded-md border px-3 py-2 text-sm">
            Criar
          </button>
        </form>
      </section>
    </main>
  );
}
