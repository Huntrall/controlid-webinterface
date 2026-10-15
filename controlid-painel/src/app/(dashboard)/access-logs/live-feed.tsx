"use client";

import { useMemo, useState } from "react";
import { Radio, Search, Server } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DirectionBadge,
  fieldCls,
  fmtAgo,
  fmtTime,
  GRANTED,
  type DeviceStatus,
  type LiveEvent,
} from "./shared";

export function LiveFeed({
  events,
  devices,
  freshIds,
  timeZone,
  nowSec,
}: {
  events: LiveEvent[];
  devices: DeviceStatus[];
  freshIds: Set<number>;
  timeZone: string;
  nowSec: number;
}) {
  const [search, setSearch] = useState("");
  const [deviceId, setDeviceId] = useState("all");
  const [showDenied, setShowDenied] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (!showDenied && e.event !== GRANTED) return false;
      if (deviceId !== "all" && e.deviceId !== deviceId) return false;
      if (!q) return true;
      return e.userName.toLowerCase().includes(q) || (e.registration ?? "").toLowerCase().includes(q);
    });
  }, [events, search, deviceId, showDenied]);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(nowSec * 1000));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 px-6 pt-5">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome ou matrícula"
            className="pl-8"
          />
        </div>
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className={cn(fieldCls, "[&>option]:bg-background")}
          aria-label="Facial"
        >
          <option value="all">Todas as faciais</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.name}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDenied}
            onChange={(e) => setShowDenied(e.target.checked)}
            className="accent-primary"
          />
          Mostrar tentativas negadas
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
          <Radio className="size-8 text-muted-foreground/30" />
          Aguardando passagens nas faciais...
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {rows.map((e) => {
            const day = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(e.time * 1000));
            return (
              <li
                key={e.id}
                className={cn(
                  "flex items-center gap-4 px-6 py-2.5 transition-colors duration-1000",
                  freshIds.has(e.id) ? "bg-emerald-500/10" : "hover:bg-muted/30"
                )}
              >
                <div className="w-20 shrink-0">
                  <div className="tabular-nums text-sm font-semibold">{fmtTime(e.time, timeZone, true)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {day === today
                      ? fmtAgo(e.time, nowSec)
                      : new Date(e.time * 1000).toLocaleDateString("pt-BR", { timeZone, day: "2-digit", month: "2-digit" })}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{e.userName}</div>
                  <div className="text-[11px] text-muted-foreground">Matrícula: {e.registration || "-"}</div>
                </div>
                <DirectionBadge direction={e.direction} event={e.event} className="shrink-0" />
                <div className="hidden sm:flex w-44 shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <Server className="size-3.5 text-indigo-400" />
                  <span className="truncate">{e.deviceName}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
