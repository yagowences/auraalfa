// Contrato do motor de auto-agendamento (Fase 2, seção 7 da doc original).
// Entrada/saída em minutos e "HH:MM" — sem acesso a banco, puro e testável.

export type JanelaPreferida = "manha" | "tarde" | "noite" | "qualquer";

export type ItemParaAgendar = {
  id: string;
  duracaoEstimadaMin: number;
  divisivel: boolean;
  tamanhoBlocoMin: number | null;
  janelaPreferida: JanelaPreferida;
  entregavelId: string;
  prazoEntregavel: string | null; // ISO date (YYYY-MM-DD)
  vindoDeRollover: boolean;
  criadoEm: string; // ISO timestamp — desempate final
};

export type CompromissoFixo = {
  diaSemana: number; // 0=domingo .. 6=sábado
  horaInicio: string; // "HH:MM"
  horaFim: string; // "HH:MM"
};

export type JanelaAcordado = {
  inicio: string; // "HH:MM"
  fim: string; // "HH:MM"
};

export type EntradaAgendamento = {
  usuarioId: string;
  semanaReferencia: string; // ISO date da segunda-feira
  itensSelecionados: ItemParaAgendar[];
  compromissosFixos: CompromissoFixo[];
  janelaAcordado: JanelaAcordado;
  // Dias antes desta data (ISO) não recebem proposta — pra não sugerir
  // horário num dia que já passou quando o ritual roda no meio da semana.
  // Omitido = considera a semana inteira (útil pra planejar do zero).
  naoAgendarAntesDe?: string;
};

export type BlocoAgendado = {
  itemId: string;
  data: string; // ISO date
  horaInicio: string;
  horaFim: string;
};

export type SaidaAgendamento = {
  propostas: BlocoAgendado[];
  itensNaoCoubem: string[];
};
