import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Service } from "./pricing";

export const CATEGORY_ORDER = ["CABELO", "PROGRESSIVA", "MECHAS", "MORENA ILUMINADA", "TRATAMENTO + ESCOVA", "CRONOGRAMA CAPILAR"];

export const servicesQuery = (includeInactive = false) =>
  queryOptions({
    queryKey: ["services", includeInactive],
    queryFn: async () => {
      let q = supabase.from("services").select("*").order("sort_order");
      if (!includeInactive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as Service[];
    },
  });

export interface BusinessHour {
  weekday: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  updated_at?: string;
  updated_by?: string | null;
}
export const hoursQuery = () =>
  queryOptions({
    queryKey: ["business_hours"],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_hours").select("*").order("weekday");
      if (error) throw error;
      return data as BusinessHour[];
    },
  });

export const settingsQuery = () =>
  queryOptions({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export function groupByCategory(services: Service[]) {
  const map = new Map<string, Service[]>();
  for (const s of services) {
    if (!map.has(s.category)) map.set(s.category, []);
    map.get(s.category)!.push(s);
  }
  return [...map.entries()].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a[0]);
    const ib = CATEGORY_ORDER.indexOf(b[0]);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function whatsappLink(number: string | null | undefined, text?: string) {
  if (!number) return null;
  const d = number.replace(/\D/g, "");
  const full = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}