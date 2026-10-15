"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, Search, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DirectionBadge,
  fieldCls,
  fmtDuration,
  fmtTime,
  type DayReport,
  type DeviceStatus,
  type PersonDay,
} from "./shared";

type StatusFilter = "all" | "inside" | "left";
type SortKey = "arrival" | "name" | "last";

function stayDuration(p: PersonDay, isToday: boolean, nowSec: number): { sec: number; ongoing: boolean } | null {
  if (p.firstIn === null) return null;
  if (p.inside && isToday) return { sec: nowSec - p.firstIn, ongoing: true };
  if (p.lastOut !== null) return { sec: p.lastOut - p.firstIn, ongoing: false };
  return null;
}

export function PresenceTable({
  report,
  devices,
  deviceFilter,
  onDeviceFilterChange,
  date,
  maxDate,
  onDateChange,
  nowSec,
  loading,
}: {
  report: DayReport | null;
  devices: DeviceStatus[];
  deviceFilter: string;
  onDeviceFilterChange: (id: string) => void;
  date: string;
  maxDate: string;
  onDateChange: (d: string) => void;
  nowSec: number;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("arrival");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const tz = report?.timeZone ?? "America/Sao_Paulo";
  const isToday = report?.isToday ?? false;

  const rows = useMemo(() => {
    if (!report) return [];
    const q = search.trim().toLowerCase();
    const list = report.people.filter((p) => {
      if (status === "inside" && !p.inside) return false;
      if (status === "left" && p.inside) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.registration ?? "").toLowerCase().includes(q);
    });
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
      if (sort === "last") return b.lastTime - a.lastTime;
      return (a.firstIn ?? Infinity) - (b.firstIn ?? Infinity);
    });
    return list;
  }, [report, search, status, sort]);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exportCsv = () => {
    if (!report) return;
    const header = ["Colaborador", "Matrícula", "Chegada", "Saída", "Permanência", "Situação", "Passagens"];
    const lines = rows.map((p) => {
      const stay = stayDuration(p, isToday, nowSec);
      return [
        p.name,
        p.registration ?? "",
        p.firstIn ? fmtTime(p.firstIn, tz) : "",
        p.lastOut ? fmtTime(p.lastOut, tz) : "",
        stay ? fmtDuration(stay.sec) : "",
        p.inside ? (isToday ? "No local" : "Sem saída registrada") : "Saiu",
        p.passages
          .map(
            (x) =>
              `${fmtTime(x.time, tz)} ${x.direction === "exit" ? "saída" : x.direction === "pass" ? "passagem" : "entrada"} (${x.deviceName})${x.counted ? "" : " [desconsiderado]"}`
          )
          .join(" | "),
      ];
    });
    const csv = [header, ...lines]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `presenca-${report.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusOptions: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "inside", label: isToday ? "No local" : "Sem saída" },
    { key: "left", label: "Saíram" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 px-6 pt-5">
        <input
          type="date"
          value={date}
          max={maxDate}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          className={cn(fieldCls, "[color-scheme:dark]")}
          aria-label="Data"
        />
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou matrícula"
            className="pl-8"
          />
        </div>
        <div className="inline-flex rounded-lg border border-input p-0.5">
          {statusOptions.map((o) => (
            <button
              key={o.key}
              onClick={() => setStatus(o.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                status === o.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <select
          value={deviceFilter}
          onChange={(e) => onDeviceFilterChange(e.target.value)}
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
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className={cn(fieldCls, "[&>option]:bg-background")}
          aria-label="Ordenar por"
        >
          <option value="arrival">Ordenar: chegada</option>
          <option value="last">Ordenar: último registro</option>
          <option value="name">Ordenar: nome</option>
        </select>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
          <Download className="size-3.5 mr-1.5" /> CSV
        </Button>
      </div>

      {!report && loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Carregando presença...</div>
      ) : rows.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
          <UserX className="size-10 text-muted-foreground/30" />
          {report?.people.length ? "Nenhum colaborador corresponde aos filtros." : "Nenhuma passagem registrada neste dia."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/60">
                <TableHead className="pl-6">Colaborador</TableHead>
                <TableHead>Chegada</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Permanência</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="pr-6 text-right">Passagens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const open = expanded.has(p.deviceUserId);
                const stay = stayDuration(p, isToday, nowSec);
                return (
                  <Fragment key={p.deviceUserId}>
                    <TableRow
                      onClick={() => toggle(p.deviceUserId)}
                      className="border-border/60 hover:bg-muted/30 cursor-pointer"
                    >
                      <TableCell className="pl-6">
                        <div className="font-medium text-sm text-foreground">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Matrícula: {p.registration || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm font-medium">
                        {p.firstIn ? fmtTime(p.firstIn, tz) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm font-medium">
                        {p.lastOut ? fmtTime(p.lastOut, tz) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {stay ? (
                          <span className={stay.ongoing ? "text-muted-foreground" : ""}>
                            {fmtDuration(stay.sec)}
                            {stay.ongoing && <span className="text-[11px]"> (em andamento)</span>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.inside ? (
                          isToday ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                              <span className="size-1.5 rounded-full bg-emerald-400" /> No local
                            </span>
                          ) : (
                            <span className="text-xs text-amber-400">Sem saída registrada</span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-muted-foreground/60" /> Saiu
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          {p.passages.filter((x) => x.counted).length}
                          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        </span>
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow className="border-border/60 bg-muted/15 hover:bg-muted/15">
                        <TableCell colSpan={6} className="px-6 py-3 whitespace-normal">
                          <div className="flex flex-wrap gap-2">
                            {p.passages.map((x, i) => (
                              <div
                                key={i}
                                title={
                                  x.counted
                                    ? undefined
                                    : "Desconsiderado: há leitura nas catracas neste dia (o portão pode ter sido segurado)"
                                }
                                className={cn(
                                  "flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1.5",
                                  !x.counted && "opacity-45 border-dashed"
                                )}
                              >
                                <span className={cn("tabular-nums text-sm font-medium", !x.counted && "line-through")}>
                                  {fmtTime(x.time, tz)}
                                </span>
                                <DirectionBadge direction={x.direction} />
                                <span className="text-[11px] text-muted-foreground">{x.deviceName}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
