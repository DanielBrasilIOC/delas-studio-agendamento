import { isValidPhone, normalizePhone, spLongDate, spTime } from "./format";

/** The hair professional is always Elaine. */
export const HAIR_PROFESSIONAL = "Elaine";

export interface ConfirmationInput {
  name: string;
  phone: string;
  services: string[];
  startsAt: string;
}

/** Exact confirmation text sent to the client via WhatsApp. */
export function confirmationMessage({ name, services, startsAt }: ConfirmationInput): string {
  return `Olá, ${name}! 💖 Seu horário no D’ELAS Studio de Beleza está confirmado! ✂️ Serviço: ${services.join(", ")} 📅 Data: ${spLongDate(startsAt)} 🕒 Horário: ${spTime(startsAt)} 💇‍♀️ Profissional: ${HAIR_PROFESSIONAL} Será um prazer receber você! Até lá! 🌸`;
}

/** wa.me link for the client's registered number, or null when no valid DDD number exists. */
export function confirmationWhatsAppLink(input: ConfirmationInput): string | null {
  if (!isValidPhone(input.phone)) return null;
  return `https://wa.me/55${normalizePhone(input.phone)}?text=${encodeURIComponent(confirmationMessage(input))}`;
}