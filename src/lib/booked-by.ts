/** Label for the "Agendado por" field. Never attributes an online booking to a staff member. */
export function bookedByLabel(a: { source: string; created_by: string | null; created_by_name?: string | null }): string {
  if (a.source === "painel" && a.created_by) return a.created_by_name?.trim() || "Equipe D’ELAS";
  return "Cliente (agendamento online)";
}