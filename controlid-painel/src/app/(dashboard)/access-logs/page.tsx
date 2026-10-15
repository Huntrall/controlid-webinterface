"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, LogIn, LogOut, RefreshCw, Radio, Users, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveFeed } from "./live-feed";
import { PresenceTable } from "./presence-table";
import { fmtAgo, fmtTime, type DayReport, type DeviceStatus, type LiveEvent } from "./shared";

const LIVE_POLL_MS = 5000;
const REPORT_REFRESH_MS = 60000;
const MAX_FEED = 300;

type Tab = "presence" | "live";

function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export default function AccessLogsPage() {
  const [tab, setTab] = useState<Tab>("presence");
  const [timeZone, setTimeZone] = useState("America/Sao_Paulo");
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set());
  const [date, setDate] = useState(() => todayIn("America/Sao_Paulo"));
  const [report, setReport] = useState<DayReport | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  const lastIdRef = useRef(0);
  const pollingRef = useRef<Promise<void> | null>(null);
  const dateRef = useRef(date);

  const loadReport = useCallback(async (d: string) => {
    try {
      const res = await fetch(`/api/access-logs/day?date=${d}`);
      if (!res.ok) throw new Error();
      const data: DayReport = await res.json();
      if (d === dateRef.current) setReport(data);
    } catch {
      toast.error("Erro ao carregar presença do dia");
    }
  }, []);

  const fetchLive = useCallback(async () => {
    try {
      const after = lastIdRef.current;
      const res = await fetch(`/api/access-logs?${after ? `afterId=${after}&limit=500` : "limit=150"}`);
      if (!res.ok) return;
      const data: { timeZone: string; devices: DeviceStatus[]; events: LiveEvent[] } = await res.json();
      setTimeZone(data.timeZone);
      setDevices(data.devices);
      if (data.events.length === 0) return;

      lastIdRef.current = Math.max(after, data.events[0].id);
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        const fresh = data.events.filter((e) => !seen.has(e.id));
        return [...fresh, ...prev].sort((a, b) => b.id - a.id).slice(0, MAX_FEED);
      });

      if (after) {
        const ids = new Set(data.events.map((e) => e.id));
        setFreshIds(ids);
        setTimeout(() => setFreshIds((cur) => (cur === ids ? new Set() : cur)), 4000);
        // Chegaram passagens novas: atualiza a presença se estiver vendo hoje.
        if (dateRef.current === todayIn(data.timeZone)) void loadReport(dateRef.current);
      }
    } catch {
      // rede instável: tenta de novo no próximo ciclo
    }
  }, [loadReport]);

  // Uma consulta por vez: se a anterior ainda não voltou (servidor ocupado
  // importando uma facial nova, rede lenta), reaproveita em vez de duplicar.
  const pollLive = useCallback(
    () =>
      (pollingRef.current ??= fetchLive().finally(() => {
        pollingRef.current = null;
      })),
    [fetchLive]
  );

  const changeDate = (d: string) => {
    setDate(d);
    dateRef.current = d;
    void loadReport(d);
  };

  useEffect(() => {
    void loadReport(dateRef.current);
    void pollLive();
    const live = setInterval(() => {
      if (document.visibilityState === "visible") void pollLive();
    }, LIVE_POLL_MS);
    const report = setInterval(() => {
      if (document.visibilityState === "visible") void loadReport(dateRef.current);
    }, REPORT_REFRESH_MS);
    const clock = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 15000);
    return () => {
      clearInterval(live);
      clearInterval(report);
      clearInterval(clock);
    };
  }, [pollLive, loadReport]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/access-logs/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDevices(data.devices);
      if (data.synced > 0) toast.success(`${data.synced} novas passagens recebidas das faciais`);
      else toast.info("Tudo em dia: nenhuma passagem nova.");
      await pollLive();
      await loadReport(dateRef.current);
    } catch {
      toast.error("Erro ao sincronizar com as faciais");
    } finally {
      setSyncing(false);
    }
  };

  const onlineCount = devices.filter((d) => d.online).length;
  const allOnline = devices.length > 0 && onlineCount === devices.length;
  const isToday = report?.isToday ?? date === todayIn(timeZone);
  const t = report?.totals;

  const tiles = [
    { label: "Pessoas no dia", value: t?.people, icon: Users, cls: "text-indigo-400 bg-indigo-500/15 border-indigo-500/25" },
    {
      label: isToday ? "No local agora" : "Sem saída registrada",
      value: t?.inside,
      icon: UserCheck,
      cls: "text-emerald-400 bg-emerald-500/15 border-emerald-500/25",
    },
    { label: "Entradas", value: t?.entries, icon: LogIn, cls: "text-sky-400 bg-sky-500/15 border-sky-500/25" },
    { label: "Saídas", value: t?.exits, icon: LogOut, cls: "text-orange-400 bg-orange-500/15 border-orange-500/25" },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Relatório de Acessos</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border",
                allOnline
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/20"
              )}
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-current" />
              </span>
              Ao vivo
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Entradas e saídas dos colaboradores em todas as faciais, atualizadas automaticamente.
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
          className="bg-card/50 border-border/60 hover:bg-muted/50"
        >
          <RefreshCw className={cn("size-4 mr-2", syncing && "animate-spin")} />
          Sincronizar agora
        </Button>
      </div>

      {devices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {devices.map((d) => (
            <div
              key={d.deviceId}
              title={d.error ?? undefined}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-3 py-1.5 text-xs"
            >
              <span className={cn("size-2 rounded-full", d.online ? "bg-emerald-400" : "bg-red-400")} />
              <span className="font-medium text-foreground">{d.name}</span>
              <span className="text-muted-foreground">
                {d.online
                  ? d.lastEventAt
                    ? `último registro ${fmtTime(d.lastEventAt, timeZone)} (${fmtAgo(d.lastEventAt, nowSec)})`
                    : "sem registros"
                  : d.lastPollAt
                    ? "offline"
                    : "conectando..."}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <Card key={tile.label} className="border-border/70 bg-card/70 py-0">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("size-9 rounded-lg border flex items-center justify-center", tile.cls)}>
                <tile.icon className="size-4" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums leading-none">{tile.value ?? "–"}</div>
                <div className="text-xs text-muted-foreground mt-1">{tile.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 bg-card/70 backdrop-blur-sm shadow-xs overflow-hidden py-0 gap-0">
        <div className="flex items-center gap-1 border-b border-border/40 bg-muted/10 px-4">
          {(
            [
              { key: "presence", label: "Presença do dia", icon: CalendarClock },
              { key: "live", label: "Ao vivo", icon: Radio },
            ] as const
          ).map((o) => (
            <button
              key={o.key}
              onClick={() => setTab(o.key)}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                tab === o.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <o.icon className="size-4" />
              {o.label}
            </button>
          ))}
        </div>
        <CardContent className="p-0 pb-2">
          {tab === "presence" ? (
            <PresenceTable
              report={report}
              date={date}
              maxDate={todayIn(timeZone)}
              onDateChange={changeDate}
              nowSec={nowSec}
              loading={report?.date !== date}
            />
          ) : (
            <LiveFeed events={events} devices={devices} freshIds={freshIds} timeZone={timeZone} nowSec={nowSec} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
