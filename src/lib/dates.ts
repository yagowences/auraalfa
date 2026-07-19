// Datas do ritual mensal são representadas como o primeiro dia do mês
// (YYYY-MM-01), em UTC — sem lidar com fuso do usuário ainda (fica pra
// quando a janela_acordado/timezone de usuarios entrar em uso real, no
// motor de agendamento da Fase 2).
export function monthStart(offsetMonths = 0): string {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1),
  );
  return d.toISOString().slice(0, 10);
}

// semana_referencia é sempre a segunda-feira da semana, em UTC — mesma
// simplificação de fuso do monthStart.
export function weekStart(offsetWeeks = 0): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=domingo .. 6=sábado
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const d = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday + offsetWeeks * 7,
    ),
  );
  return d.toISOString().slice(0, 10);
}
