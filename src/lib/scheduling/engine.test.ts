import { describe, it, expect } from "vitest";
import { agendar } from "./engine";
import type { EntradaAgendamento } from "./types";

describe("agendar", () => {
  it("posiciona um item que cabe numa semana sem compromissos", () => {
    const entrada: EntradaAgendamento = {
      usuarioId: "u1",
      semanaReferencia: "2026-07-13", // segunda-feira
      itensSelecionados: [
        {
          id: "item-1",
          duracaoEstimadaMin: 60,
          divisivel: false,
          tamanhoBlocoMin: null,
          janelaPreferida: "qualquer",
          entregavelId: "e1",
          prazoEntregavel: null,
          vindoDeRollover: false,
          criadoEm: "2026-07-01T10:00:00Z",
        },
      ],
      compromissosFixos: [],
      janelaAcordado: { inicio: "07:00", fim: "22:00" },
    };

    const saida = agendar(entrada);

    expect(saida.itensNaoCoubem).toEqual([]);
    expect(saida.propostas).toHaveLength(1);
    expect(saida.propostas[0].itemId).toBe("item-1");
    expect(saida.propostas[0].data).toBe("2026-07-13");
  });

  it("retorna o item em itensNaoCoubem quando não há slot livre em toda a semana", () => {
    const entrada: EntradaAgendamento = {
      usuarioId: "u1",
      semanaReferencia: "2026-07-13",
      itensSelecionados: [
        {
          id: "item-1",
          duracaoEstimadaMin: 60,
          divisivel: false,
          tamanhoBlocoMin: null,
          janelaPreferida: "qualquer",
          entregavelId: "e1",
          prazoEntregavel: null,
          vindoDeRollover: false,
          criadoEm: "2026-07-01T10:00:00Z",
        },
      ],
      // janela acordado com 0 minutos de folga: início == fim
      compromissosFixos: [],
      janelaAcordado: { inicio: "07:00", fim: "07:00" },
    };

    const saida = agendar(entrada);

    expect(saida.propostas).toEqual([]);
    expect(saida.itensNaoCoubem).toEqual(["item-1"]);
  });

  it("agenda no espaço livre depois de subtrair um compromisso fixo", () => {
    const entrada: EntradaAgendamento = {
      usuarioId: "u1",
      semanaReferencia: "2026-07-13", // segunda-feira
      itensSelecionados: [
        {
          id: "item-1",
          duracaoEstimadaMin: 60,
          divisivel: false,
          tamanhoBlocoMin: null,
          janelaPreferida: "qualquer",
          entregavelId: "e1",
          prazoEntregavel: null,
          vindoDeRollover: false,
          criadoEm: "2026-07-01T10:00:00Z",
        },
      ],
      // segunda-feira (diaSemana=1) ocupada de 07:00 às 21:00, só sobra 1h no fim
      compromissosFixos: [{ diaSemana: 1, horaInicio: "07:00", horaFim: "21:00" }],
      janelaAcordado: { inicio: "07:00", fim: "22:00" },
    };

    const saida = agendar(entrada);

    expect(saida.itensNaoCoubem).toEqual([]);
    expect(saida.propostas[0].data).toBe("2026-07-13");
    expect(saida.propostas[0].horaInicio).toBe("21:00");
    expect(saida.propostas[0].horaFim).toBe("22:00");
  });

  it("trata compromissos sobrepostos no mesmo dia sem duplicar espaço livre", () => {
    const entrada: EntradaAgendamento = {
      usuarioId: "u1",
      semanaReferencia: "2026-07-13",
      itensSelecionados: [
        {
          id: "item-1",
          duracaoEstimadaMin: 60,
          divisivel: false,
          tamanhoBlocoMin: null,
          janelaPreferida: "qualquer",
          entregavelId: "e1",
          prazoEntregavel: null,
          vindoDeRollover: false,
          criadoEm: "2026-07-01T10:00:00Z",
        },
      ],
      // dois compromissos sobrepostos na segunda: 09:00-11:00 e 10:00-12:00
      // — juntos ocupam 09:00-12:00, não devem "vazar" espaço livre no meio
      compromissosFixos: [
        { diaSemana: 1, horaInicio: "09:00", horaFim: "11:00" },
        { diaSemana: 1, horaInicio: "10:00", horaFim: "12:00" },
      ],
      janelaAcordado: { inicio: "09:00", fim: "12:00" },
    };

    const saida = agendar(entrada);

    // não sobra 1h livre nenhuma na segunda (09:00-12:00 todo ocupado) —
    // o item tem que ir pra terça-feira
    expect(saida.itensNaoCoubem).toEqual([]);
    expect(saida.propostas[0].data).toBe("2026-07-14");
  });

  it("quebra um item divisível em blocos de tamanho_bloco_min em dias diferentes", () => {
    const entrada: EntradaAgendamento = {
      usuarioId: "u1",
      semanaReferencia: "2026-07-13",
      itensSelecionados: [
        {
          id: "item-1",
          duracaoEstimadaMin: 90,
          divisivel: true,
          tamanhoBlocoMin: 45,
          janelaPreferida: "qualquer",
          entregavelId: "e1",
          prazoEntregavel: null,
          vindoDeRollover: false,
          criadoEm: "2026-07-01T10:00:00Z",
        },
      ],
      // só 45 min livres por dia
      compromissosFixos: [{ diaSemana: 1, horaInicio: "07:45", horaFim: "22:00" }],
      janelaAcordado: { inicio: "07:00", fim: "22:00" },
    };

    const saida = agendar(entrada);

    expect(saida.itensNaoCoubem).toEqual([]);
    expect(saida.propostas).toHaveLength(2);
    expect(saida.propostas.every((p) => p.itemId === "item-1")).toBe(true);
    const duracoes = saida.propostas.map((p) => {
      const [h1, m1] = p.horaInicio.split(":").map(Number);
      const [h2, m2] = p.horaFim.split(":").map(Number);
      return h2 * 60 + m2 - (h1 * 60 + m1);
    });
    expect(duracoes).toEqual([45, 45]);
  });

  it("não agenda parcialmente um item divisível que não cabe inteiro — libera o espaço tentado", () => {
    const entrada: EntradaAgendamento = {
      usuarioId: "u1",
      semanaReferencia: "2026-07-13",
      itensSelecionados: [
        {
          id: "grande",
          duracaoEstimadaMin: 999999,
          divisivel: true,
          tamanhoBlocoMin: 30,
          janelaPreferida: "qualquer",
          entregavelId: "e1",
          prazoEntregavel: null,
          vindoDeRollover: false,
          criadoEm: "2026-07-01T10:00:00Z",
        },
        {
          id: "pequeno",
          duracaoEstimadaMin: 30,
          divisivel: false,
          tamanhoBlocoMin: null,
          janelaPreferida: "qualquer",
          entregavelId: "e1",
          prazoEntregavel: null,
          vindoDeRollover: false,
          criadoEm: "2026-07-02T10:00:00Z",
        },
      ],
      compromissosFixos: [],
      janelaAcordado: { inicio: "07:00", fim: "08:00" },
    };

    const saida = agendar(entrada);

    expect(saida.itensNaoCoubem).toEqual(["grande"]);
    // o item pequeno consegue usar a semana inteira porque o grande não
    // consumiu nenhum slot ao falhar
    expect(saida.propostas).toHaveLength(1);
    expect(saida.propostas[0].itemId).toBe("pequeno");
  });

  it("prioriza item vindo de rollover sobre item mais antigo sem rollover", () => {
    const entrada: EntradaAgendamento = {
      usuarioId: "u1",
      semanaReferencia: "2026-07-13",
      itensSelecionados: [
        {
          id: "antigo-sem-rollover",
          duracaoEstimadaMin: 60,
          divisivel: false,
          tamanhoBlocoMin: null,
          janelaPreferida: "qualquer",
          entregavelId: "e1",
          prazoEntregavel: null,
          vindoDeRollover: false,
          criadoEm: "2026-06-01T10:00:00Z",
        },
        {
          id: "novo-com-rollover",
          duracaoEstimadaMin: 60,
          divisivel: false,
          tamanhoBlocoMin: null,
          janelaPreferida: "qualquer",
          entregavelId: "e1",
          prazoEntregavel: null,
          vindoDeRollover: true,
          criadoEm: "2026-07-10T10:00:00Z",
        },
      ],
      // bloqueia todo dia da semana exceto segunda — só sobra 1 slot de 60min
      // em toda a semana pros dois itens disputarem
      compromissosFixos: [0, 2, 3, 4, 5, 6].map((diaSemana) => ({
        diaSemana,
        horaInicio: "07:00",
        horaFim: "08:00",
      })),
      janelaAcordado: { inicio: "07:00", fim: "08:00" },
    };

    const saida = agendar(entrada);

    expect(saida.propostas).toHaveLength(1);
    expect(saida.propostas[0].itemId).toBe("novo-com-rollover");
    expect(saida.itensNaoCoubem).toEqual(["antigo-sem-rollover"]);
  });

  it("prioriza prazo de entregável mais próximo sobre item vindo de rollover", () => {
    const entrada: EntradaAgendamento = {
      usuarioId: "u1",
      semanaReferencia: "2026-07-13",
      itensSelecionados: [
        {
          id: "com-rollover-prazo-longe",
          duracaoEstimadaMin: 60,
          divisivel: false,
          tamanhoBlocoMin: null,
          janelaPreferida: "qualquer",
          entregavelId: "e1",
          prazoEntregavel: "2026-09-30",
          vindoDeRollover: true,
          criadoEm: "2026-07-10T10:00:00Z",
        },
        {
          id: "sem-rollover-prazo-perto",
          duracaoEstimadaMin: 60,
          divisivel: false,
          tamanhoBlocoMin: null,
          janelaPreferida: "qualquer",
          entregavelId: "e2",
          prazoEntregavel: "2026-07-31",
          vindoDeRollover: false,
          criadoEm: "2026-07-10T10:00:00Z",
        },
      ],
      compromissosFixos: [],
      janelaAcordado: { inicio: "07:00", fim: "08:00" },
    };

    const saida = agendar(entrada);

    expect(saida.propostas[0].itemId).toBe("sem-rollover-prazo-perto");
  });

  it("respeita a janela preferida mesmo quando um dia anterior tem slot fora dela", () => {
    const entrada: EntradaAgendamento = {
      usuarioId: "u1",
      semanaReferencia: "2026-07-13", // segunda
      itensSelecionados: [
        {
          id: "item-1",
          duracaoEstimadaMin: 60,
          divisivel: false,
          tamanhoBlocoMin: null,
          janelaPreferida: "manha",
          entregavelId: "e1",
          prazoEntregavel: null,
          vindoDeRollover: false,
          criadoEm: "2026-07-01T10:00:00Z",
        },
      ],
      // segunda só livre à noite (18h+); terça livre de manhã também
      compromissosFixos: [{ diaSemana: 1, horaInicio: "07:00", horaFim: "18:00" }],
      janelaAcordado: { inicio: "07:00", fim: "22:00" },
    };

    const saida = agendar(entrada);

    // preferiu terça de manhã a segunda à noite, mesmo a segunda vindo antes
    expect(saida.propostas[0].data).toBe("2026-07-14");
    expect(saida.propostas[0].horaInicio).toBe("07:00");
  });

  it("não sugere horário em dia anterior a naoAgendarAntesDe", () => {
    const entrada: EntradaAgendamento = {
      usuarioId: "u1",
      semanaReferencia: "2026-07-13", // segunda
      itensSelecionados: [
        {
          id: "item-1",
          duracaoEstimadaMin: 60,
          divisivel: false,
          tamanhoBlocoMin: null,
          janelaPreferida: "qualquer",
          entregavelId: "e1",
          prazoEntregavel: null,
          vindoDeRollover: false,
          criadoEm: "2026-07-01T10:00:00Z",
        },
      ],
      compromissosFixos: [],
      janelaAcordado: { inicio: "07:00", fim: "22:00" },
      // ritual rodando no domingo, último dia da semana — não pode propor
      // nada de segunda a sábado, só domingo (2026-07-19) em diante
      naoAgendarAntesDe: "2026-07-19",
    };

    const saida = agendar(entrada);

    expect(saida.itensNaoCoubem).toEqual([]);
    expect(saida.propostas[0].data).toBe("2026-07-19");
  });
});
