import { LogIn, LogOut, DoorOpen, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeviceStatus {
  deviceId: string;
  name: string;
  online: boolean;
  lastPollAt: number | null;
  lastOkAt: number | null;
  lastEventAt: number | null;
  error: string | null;
}

export interface LiveEvent {
  id: number;
  time: number;
  event: number;
  direction: "entry" | "exit" | "pass";
  deviceId: string;
  deviceName: string;
  deviceUserId: number;
  userName: string;
  registration: string | null;
}

export interface Passage {
  time: number;
  direction: "entry" | "exit" | "pass";
  deviceName: string;
}

export interface PersonDay {
  deviceUserId: number;
  name: string;
  registration: string | null;
  passages: Passage[];
  firstIn: number | null;
  lastOut: number | null;
  lastTime: number;
  inside: boolean;
}

export interface DayReport {
  date: string;
  timeZone: string;
  isToday: boolean;
  totals: { people: number; entries: number; exits: number; inside: number };
  people: PersonDay[];
}

export const GRANTED = 7;

export function fmtTime(epochSec: number, timeZone: string, seconds = false) {
  return new Date(epochSec * 1000).toLocaleTimeString("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    ...(seconds ? { second: "2-digit" } : {}),
  });
}

export function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

export function fmtAgo(epochSec: number, nowSec: number) {
  const d = Math.max(0, nowSec - epochSec);
  if (d < 60) return "agora";
  if (d < 3600) return `há ${Math.floor(d / 60)} min`;
  if (d < 86400) return `há ${Math.floor(d / 3600)} h`;
  return `há ${Math.floor(d / 86400)} d`;
}

const DIRECTION = {
  entry: { label: "Entrada", icon: LogIn, cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  exit: { label: "Saída", icon: LogOut, cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  pass: { label: "Passagem", icon: DoorOpen, cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
} as const;

const DENIED_LABEL: Record<number, string> = {
  3: "Não identificado",
  6: "Negado",
  13: "Desistiu",
};

export function DirectionBadge({
  direction,
  event = GRANTED,
  className,
}: {
  direction: Passage["direction"];
  event?: number;
  className?: string;
}) {
  if (event !== GRANTED) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium bg-red-500/10 text-red-400 border-red-500/25", className)}>
        <Ban className="size-3" /> {DENIED_LABEL[event] ?? "Não liberado"}
      </span>
    );
  }
  const d = DIRECTION[direction] ?? DIRECTION.pass;
  const Icon = d.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", d.cls, className)}>
      <Icon className="size-3" /> {d.label}
    </span>
  );
}

export const fieldCls =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
