import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PublicLayout } from "@/components/site/SiteChrome";
import { BookingConfirmation, BookingForm, type BookingResult } from "@/components/site/BookingForm";

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Agendar horário | D’ELAS — Studio de Beleza" },
      { name: "description", content: "Escolha os serviços de cabelo, a data e o horário e agende online no D’ELAS Studio de Beleza." },
      { property: "og:title", content: "Agendar horário — D’ELAS Studio de Beleza" },
      { property: "og:description", content: "Agende seu horário de cabelo online em poucos passos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Agendar,
});

function Agendar() {
  const [done, setDone] = useState<BookingResult | null>(null);
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="eyebrow text-primary">Agendamento</p>
        <h1 className="mt-2 text-4xl">Agende seu horário</h1>
        <div className="mt-8">{done ? <BookingConfirmation r={done} /> : <BookingForm onDone={setDone} />}</div>
      </div>
    </PublicLayout>
  );
}