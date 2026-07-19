import type {
  EntradaAgendamento,
  SaidaAgendamento,
  ItemParaAgendar,
  JanelaPreferida,
} from "./types";

type Intervalo = { inicio: number; fim: number };

function parseHora(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function formatHora(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function addDias(dataIso: string, dias: number): string {
  const d = new Date(`${dataIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diaSemanaDe(dataIso: string): number {
  return new Date(`${dataIso}T00:00:00Z`).getUTCDay();
}

// Subtrai um intervalo ocupado de uma lista de intervalos livres,
// possivelmente partindo um intervalo livre em dois.
function subtrairIntervalo(livres: Intervalo[], ocupado: Intervalo): Intervalo[] {
  const resultado: Intervalo[] = [];
  for (const livre of livres) {
    if (ocupado.fim <= livre.inicio || ocupado.inicio >= livre.fim) {
      resultado.push(livre);
      continue;
    }
    if (ocupado.inicio > livre.inicio) {
      resultado.push({ inicio: livre.inicio, fim: Math.min(ocupado.inicio, livre.fim) });
    }
    if (ocupado.fim < livre.fim) {
      resultado.push({ inicio: Math.max(ocupado.fim, livre.inicio), fim: livre.fim });
    }
  }
  return resultado;
}

function construirSlotsDaSemana(entrada: EntradaAgendamento): Map<string, Intervalo[]> {
  const inicioJanela = parseHora(entrada.janelaAcordado.inicio);
  const fimJanela = parseHora(entrada.janelaAcordado.fim);
  const slots = new Map<string, Intervalo[]>();

  for (let i = 0; i < 7; i++) {
    const data = addDias(entrada.semanaReferencia, i);

    // Dia já passado em relação a naoAgendarAntesDe: sem capacidade, ponto.
    if (entrada.naoAgendarAntesDe && data < entrada.naoAgendarAntesDe) {
      slots.set(data, []);
      continue;
    }

    const diaSemana = diaSemanaDe(data);
    let livres: Intervalo[] = [{ inicio: inicioJanela, fim: fimJanela }];

    // compromissos_fixos são recorrentes por dia da semana, não por data —
    // podem existir vários no mesmo dia, inclusive sobrepostos.
    const compromissosDoDia = entrada.compromissosFixos
      .filter((c) => c.diaSemana === diaSemana)
      .sort((a, b) => parseHora(a.horaInicio) - parseHora(b.horaInicio));

    for (const c of compromissosDoDia) {
      livres = subtrairIntervalo(livres, {
        inicio: parseHora(c.horaInicio),
        fim: parseHora(c.horaFim),
      });
    }

    slots.set(
      data,
      livres.filter((iv) => iv.fim > iv.inicio),
    );
  }

  return slots;
}

const JANELAS: Record<Exclude<JanelaPreferida, "qualquer">, Intervalo> = {
  manha: { inicio: parseHora("06:00"), fim: parseHora("12:00") },
  tarde: { inicio: parseHora("12:00"), fim: parseHora("18:00") },
  noite: { inicio: parseHora("18:00"), fim: parseHora("23:59") },
};

function clamp(iv: Intervalo, janela: Intervalo | null): Intervalo | null {
  if (!janela) return iv;
  const inicio = Math.max(iv.inicio, janela.inicio);
  const fim = Math.min(iv.fim, janela.fim);
  if (fim <= inicio) return null;
  return { inicio, fim };
}

type SlotEncontrado = { data: string; inicio: number; fim: number };

// Procura `min` minutos contíguos livres. Tenta primeiro dentro da janela
// preferida (manhã/tarde/noite); se não achar, cai pra qualquer horário
// livre — preferência é um desejo, não uma trava.
function encontrarSlot(
  slots: Map<string, Intervalo[]>,
  min: number,
  janelaPreferida: JanelaPreferida,
  datas: string[],
): SlotEncontrado | null {
  const janela = janelaPreferida === "qualquer" ? null : JANELAS[janelaPreferida];

  if (janela) {
    for (const data of datas) {
      for (const iv of slots.get(data) ?? []) {
        const clampado = clamp(iv, janela);
        if (clampado && clampado.fim - clampado.inicio >= min) {
          return { data, inicio: clampado.inicio, fim: clampado.inicio + min };
        }
      }
    }
  }

  for (const data of datas) {
    for (const iv of slots.get(data) ?? []) {
      if (iv.fim - iv.inicio >= min) {
        return { data, inicio: iv.inicio, fim: iv.inicio + min };
      }
    }
  }

  return null;
}

function ocuparSlot(slots: Map<string, Intervalo[]>, data: string, inicio: number, fim: number) {
  slots.set(data, subtrairIntervalo(slots.get(data) ?? [], { inicio, fim }));
}

function clonarSlots(slots: Map<string, Intervalo[]>): Map<string, Intervalo[]> {
  return new Map(Array.from(slots.entries()).map(([data, ivs]) => [data, ivs.map((iv) => ({ ...iv }))]));
}

// Ordem de prioridade (seção 7 da doc): prazo do entregável mais próximo →
// item que veio de rollover → ordem de criação.
function chavePrioridade(item: ItemParaAgendar): [number, number, number] {
  const prazo = item.prazoEntregavel ? new Date(item.prazoEntregavel).getTime() : Infinity;
  const rollover = item.vindoDeRollover ? 0 : 1;
  const criado = new Date(item.criadoEm).getTime();
  return [prazo, rollover, criado];
}

function compararPrioridade(a: ItemParaAgendar, b: ItemParaAgendar): number {
  const [pa, ra, ca] = chavePrioridade(a);
  const [pb, rb, cb] = chavePrioridade(b);
  if (pa !== pb) return pa - pb;
  if (ra !== rb) return ra - rb;
  return ca - cb;
}

export function agendar(entrada: EntradaAgendamento): SaidaAgendamento {
  const slots = construirSlotsDaSemana(entrada);
  const datas = Array.from(slots.keys());
  const itensOrdenados = [...entrada.itensSelecionados].sort(compararPrioridade);

  const propostas: SaidaAgendamento["propostas"] = [];
  const itensNaoCoubem: string[] = [];

  for (const item of itensOrdenados) {
    if (!item.divisivel) {
      const achou = encontrarSlot(slots, item.duracaoEstimadaMin, item.janelaPreferida, datas);
      if (!achou) {
        itensNaoCoubem.push(item.id);
        continue;
      }
      ocuparSlot(slots, achou.data, achou.inicio, achou.fim);
      propostas.push({
        itemId: item.id,
        data: achou.data,
        horaInicio: formatHora(achou.inicio),
        horaFim: formatHora(achou.fim),
      });
      continue;
    }

    // Divisível: só confirma se conseguir alocar a duração inteira — se
    // faltar um pedaço, desfaz a tentativa inteira (não deixa o item
    // "meio agendado", e libera o espaço pros próximos da fila).
    const tamanhoBloco = item.tamanhoBlocoMin ?? item.duracaoEstimadaMin;
    const slotsTentativa = clonarSlots(slots);
    const blocosTentativa: SlotEncontrado[] = [];
    let restante = item.duracaoEstimadaMin;

    while (restante > 0) {
      const tamanho = Math.min(tamanhoBloco, restante);
      const achou = encontrarSlot(slotsTentativa, tamanho, item.janelaPreferida, datas);
      if (!achou) break;
      ocuparSlot(slotsTentativa, achou.data, achou.inicio, achou.fim);
      blocosTentativa.push(achou);
      restante -= tamanho;
    }

    if (restante > 0) {
      itensNaoCoubem.push(item.id);
      continue;
    }

    for (const bloco of blocosTentativa) {
      ocuparSlot(slots, bloco.data, bloco.inicio, bloco.fim);
      propostas.push({
        itemId: item.id,
        data: bloco.data,
        horaInicio: formatHora(bloco.inicio),
        horaFim: formatHora(bloco.fim),
      });
    }
  }

  return { propostas, itensNaoCoubem };
}
