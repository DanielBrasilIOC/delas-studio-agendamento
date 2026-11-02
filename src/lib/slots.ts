import { toIso } from "./format";

export interface Interval {
  starts_at: string;
  ends_at: string;
}

function toMin(t: string) {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
}
function fromMin(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Free start times (HH:mm) for a São Paulo local date. Server re-validates every booking. */
export function generateSlots(opts: {
  date: string;
  open: string;
  close: string;
  duration: number;
  busy: Interval[];
  nowMs: number;
  step?: number;
}): string[] {
  const step = opts.step ?? 30;
  const out: string[] = [];
  const busy = opts.busy.map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at)] as const);
  for (let m = toMin(opts.open); m + opts.duration <= toMin(opts.close); m += step) {
    const t = fromMin(m);
    const s = Date.parse(toIso(opts.date, t));
    const e = s + opts.duration * 60000;
    if (s <= opts.nowMs) continue;
    if (busy.some(([bs, be]) => s < be && e > bs)) continue;
    out.push(t);
  }
  return out;
}