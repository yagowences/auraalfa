// Tipos mínimos das tabelas usadas pelo corte vertical da Fase 1.
// Espelham supabase/schema.sql — não são gerados automaticamente porque o
// CLI ainda não está linkado ao projeto (ver Fase 4).

export type EstadoEntregavel = "planejado" | "confirmado" | "concluido";

export type Meta = {
  id: string;
  usuario_id: string;
  titulo: string;
  descricao: string | null;
  data_alvo: string | null;
  ativa: boolean;
  created_at: string;
};

export type Fase = {
  id: string;
  meta_id: string;
  nome: string;
  ordem: number;
  data_inicio: string | null;
  data_fim: string | null;
  created_at: string;
};

export type Checkpoint = {
  id: string;
  meta_id: string;
  mes_gatilho: string;
  descricao: string | null;
  created_at: string;
};

export type EntregavelMensal = {
  id: string;
  meta_id: string;
  mes: string;
  titulo: string;
  estado: EstadoEntregavel;
  origem: "pre_criado" | "criado_no_ritual";
  created_at: string;
};

export type ProgressoEntregavel = {
  entregavel_id: string;
  meta_id: string;
  mes: string;
  titulo: string;
  estado: EstadoEntregavel;
  itens_totais: number;
  itens_concluidos: number;
  fracao_concluida: number;
};

export type OrigemBloco = "sugerido" | "fixado_manual";

export type BlocoAgendadoDb = {
  id: string;
  item_id: string;
  semana_referencia: string;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  origem_bloco: OrigemBloco;
  created_at: string;
};
