import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade | D’ELAS — Studio de Beleza" },
      { name: "description", content: "Como o D’ELAS Studio de Beleza usa e protege os dados informados no agendamento." },
      { property: "og:title", content: "Política de privacidade — D’ELAS" },
      { property: "og:description", content: "Uso e proteção dos seus dados no agendamento online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PublicLayout>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-sm leading-relaxed">
        <h1 className="text-4xl">Política de privacidade</h1>
        <p>Coletamos apenas nome, telefone e observações informados no agendamento, usados exclusivamente para confirmar e organizar seu atendimento.</p>
        <p>Os dados são acessíveis somente à equipe do salão e não são vendidos nem compartilhados com terceiros.</p>
        <p>Para corrigir ou excluir seus dados, fale conosco pelo WhatsApp do salão.</p>
      </div>
    </PublicLayout>
  ),
});