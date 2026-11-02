import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/SiteChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Área da equipe | D’ELAS — Studio de Beleza" },
      { name: "description", content: "Acesso restrito à equipe do D’ELAS Studio de Beleza." },
      { property: "og:title", content: "Área da equipe — D’ELAS" },
      { property: "og:description", content: "Acesso restrito à equipe do salão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error("E-mail ou senha incorretos"); return; }
    nav({ to: "/painel" });
  }
  return (
    <PublicLayout>
      <form onSubmit={signIn} className="mx-auto max-w-sm space-y-4 px-4 py-16">
        <h1 className="text-3xl">Área da equipe</h1>
        <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Label htmlFor="password">Senha</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</Button>
      </form>
    </PublicLayout>
  );
}