import { db } from "./db";
import { decrypt } from "./crypto";
import {
  fetchAccessLogs,
  getDeviceClock,
  getLatestAccessLogId,
  listPortals,
  listUserNames,
  type Device,
  type DeviceAccessLog,
} from "./controlid";

// Coletor de acessos: a cada POLL_MS pergunta a cada facial apenas pelos logs
// com id maior que o último já salvo e grava em AccessEvent.

const POLL_MS = Math.max(2, Number(process.env.ACCESS_POLL_SECONDS ?? 5)) * 1000;
const BACKFILL_DAYS = Math.max(1, Number(process.env.ACCESS_BACKFILL_DAYS ?? 30));
const BATCH = 1000;
const MAX_BATCHES_PER_TICK = 20;
const META_TTL_MS = 30 * 60 * 1000; // relógio + portais
const USERS_TTL_MS = 10 * 60 * 1000;
const RESET_CHECK_MS = 10 * 60 * 1000;
const OFFLINE_BACKOFF_MS = 30 * 1000;

export type Direction = "entry" | "exit" | "pass";

export interface DeviceStatus {
  deviceId: string;
  name: string;
  online: boolean;
  lastPollAt: number | null;
  lastOkAt: number | null;
  lastEventAt: number | null;
  error: string | null;
}

interface DeviceState {
  cursor: number | null; // último id de log visto no aparelho
  minDeviceTime?: number; // só no backfill inicial / após reset do aparelho
  offsetSec: number; // relógio do aparelho - UTC real
  portals: Map<number, Direction>;
  metaAt: number;
  users: Map<number, { name: string; registration: string }>;
  usersAt: number;
  resetCheckAt: number;
  status: DeviceStatus;
}

interface CollectorGlobal {
  started: boolean;
  timer?: NodeJS.Timeout;
  states: Map<string, DeviceState>;
  // Coleta em andamento por facial: cada uma anda no seu ritmo, então uma
  // facial lenta ou offline não atrasa as outras.
  inflight: Map<string, Promise<number>>;
}

const g = globalThis as unknown as { __accessCollector?: CollectorGlobal };
const collector: CollectorGlobal = (g.__accessCollector ??= { started: false, states: new Map(), inflight: new Map() });
collector.inflight ??= new Map();

function directionFromName(name: string): Direction | null {
  const n = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (n.includes("saida")) return "exit";
  if (n.includes("entrada")) return "entry";
  return null;
}

async function refreshMeta(device: Device, st: DeviceState) {
  const deviceClock = await getDeviceClock(device);
  // Arredonda para 15 min: o que interessa é o fuso, não a deriva do relógio.
  st.offsetSec = Math.round((deviceClock - Date.now() / 1000) / 900) * 900;

  const portals = await listPortals(device);
  st.portals = new Map();
  for (const p of portals) {
    // Catracas expõem "Portal de Entrada"/"Portal de Saída". Portal único
    // genérico (ex.: portão) vira "passagem", a não ser que o nome do
    // aparelho deixe claro que ele é só de saída.
    const fromPortal = directionFromName(p.name);
    const fromDevice = portals.length === 1 ? directionFromName(device.name) : null;
    st.portals.set(p.id, fromPortal ?? (fromDevice === "exit" ? "exit" : "pass"));
  }
  st.metaAt = Date.now();
}

async function refreshUsers(device: Device, st: DeviceState) {
  const users = await listUserNames(device);
  st.users = new Map(users.map((u) => [u.id, { name: u.name, registration: u.registration }]));
  st.usersAt = Date.now();
}

async function ensureUsers(device: Device, st: DeviceState, logs: DeviceAccessLog[]) {
  const missing = [...new Set(logs.map((l) => l.user_id))].filter((id) => id > 0 && !st.users.has(id));
  if (missing.length === 0) return;
  const users = await listUserNames(device, missing);
  for (const u of users) st.users.set(u.id, { name: u.name, registration: u.registration });
}

async function initState(device: Device): Promise<DeviceState> {
  const last = await db.accessEvent.findFirst({
    where: { deviceId: device.id },
    orderBy: { time: "desc" },
    select: { deviceLogId: true, time: true },
  });
  const st: DeviceState = {
    cursor: last?.deviceLogId ?? null,
    offsetSec: 0,
    portals: new Map(),
    metaAt: 0,
    users: new Map(),
    usersAt: 0,
    resetCheckAt: Date.now(),
    status: {
      deviceId: device.id,
      name: device.name,
      online: false,
      lastPollAt: null,
      lastOkAt: null,
      lastEventAt: last?.time ?? null,
      error: null,
    },
  };
  return st;
}

async function insertEvents(device: Device, st: DeviceState, logs: DeviceAccessLog[]): Promise<number> {
  const rows = logs.filter((l) => l.user_id > 0);
  if (rows.length === 0) return 0;
  st.status.lastEventAt = Math.max(st.status.lastEventAt ?? 0, rows[rows.length - 1].time - st.offsetSec);

  const placeholders: string[] = [];
  const params: unknown[] = [];
  for (const l of rows) {
    const user = st.users.get(l.user_id);
    placeholders.push("(?, ?, ?, ?, ?, ?, ?, ?, ?)");
    params.push(
      device.id,
      l.id,
      l.time - st.offsetSec,
      l.event,
      st.portals.get(l.portal_id) ?? "pass",
      l.portal_id ?? null,
      l.user_id,
      user?.name || `Usuário #${l.user_id}`,
      user?.registration || null
    );
  }
  return db.$executeRawUnsafe(
    `INSERT OR IGNORE INTO "AccessEvent"
      ("deviceId", "deviceLogId", "time", "event", "direction", "portalId", "deviceUserId", "userName", "registration")
     VALUES ${placeholders.join(", ")}`,
    ...params
  );
}

function pollDevice(device: Device): Promise<number> {
  let p = collector.inflight.get(device.id);
  if (!p) {
    p = pollDeviceOnce(device)
      .catch((err) => {
        console.error(`[access-collector] ${device.name}:`, err);
        return 0;
      })
      .finally(() => collector.inflight.delete(device.id));
    collector.inflight.set(device.id, p);
  }
  return p;
}

async function pollDeviceOnce(device: Device): Promise<number> {
  let st = collector.states.get(device.id);
  if (!st) {
    st = await initState(device);
    collector.states.set(device.id, st);
  }
  st.status.name = device.name;

  const now = Date.now();
  if (!st.status.online && st.status.lastPollAt && now - st.status.lastPollAt < OFFLINE_BACKOFF_MS) {
    return 0;
  }
  st.status.lastPollAt = now;

  try {
    if (now - st.metaAt > META_TTL_MS) await refreshMeta(device, st);
    if (now - st.usersAt > USERS_TTL_MS) await refreshUsers(device, st);

    if (st.cursor === null) {
      // Primeira vez com este aparelho: importa só os últimos BACKFILL_DAYS.
      st.cursor = 0;
      st.minDeviceTime = Math.floor(now / 1000) + st.offsetSec - BACKFILL_DAYS * 86400;
    }

    let inserted = 0;
    for (let i = 0; i < MAX_BATCHES_PER_TICK; i++) {
      const logs = await fetchAccessLogs(device, {
        afterId: st.cursor,
        minDeviceTime: st.minDeviceTime,
        limit: BATCH,
      });
      if (logs.length === 0) break;
      await ensureUsers(device, st, logs);
      inserted += await insertEvents(device, st, logs);
      st.cursor = logs[logs.length - 1].id;
      if (logs.length < BATCH) {
        st.minDeviceTime = undefined;
        break;
      }
    }

    // Se o aparelho for resetado os ids recomeçam do zero e "id > cursor"
    // nunca mais retornaria nada. Verifica isso de tempos em tempos.
    if (inserted === 0 && now - st.resetCheckAt > RESET_CHECK_MS) {
      st.resetCheckAt = now;
      const latest = await getLatestAccessLogId(device);
      if (latest < st.cursor) {
        console.warn(`[access-collector] ${device.name}: ids de log reiniciaram (${st.cursor} → ${latest})`);
        const last = await db.accessEvent.findFirst({
          where: { deviceId: device.id },
          orderBy: { time: "desc" },
          select: { time: true },
        });
        st.cursor = 0;
        st.minDeviceTime = (last?.time ?? Math.floor(now / 1000)) + st.offsetSec;
      }
    }

    st.status.online = true;
    st.status.lastOkAt = Date.now();
    st.status.error = null;
    return inserted;
  } catch (err) {
    st.status.online = false;
    st.status.error = err instanceof Error ? err.message : "Erro desconhecido";
    return 0;
  }
}

async function loadDevices(): Promise<Device[]> {
  const rows = await db.device.findMany({ where: { active: true } });
  return rows.map((d) => ({
    id: d.id,
    name: d.name,
    baseUrl: d.baseUrl,
    login: d.login,
    password: decrypt(d.passwordEnc),
  }));
}

async function startPolls(force: boolean): Promise<Promise<number>[]> {
  const devices = await loadDevices();
  const ids = new Set(devices.map((d) => d.id));
  for (const id of collector.states.keys()) if (!ids.has(id)) collector.states.delete(id);
  return devices.map((d) => {
    const st = collector.states.get(d.id);
    if (force && st) st.status.lastPollAt = null; // ignora a espera de offline
    return pollDevice(d);
  });
}

// Coleta agora em todas as faciais e aguarda o resultado (botão "Sincronizar").
export async function collectNow(): Promise<number> {
  const results = await Promise.all(await startPolls(true));
  return results.reduce((a, b) => a + b, 0);
}

export function getCollectorStatus(): DeviceStatus[] {
  return [...collector.states.values()].map((s) => ({ ...s.status }));
}

export function startAccessCollector() {
  if (collector.started || process.env.ACCESS_COLLECTOR === "off") return;
  collector.started = true;
  console.log(`[access-collector] iniciado (a cada ${POLL_MS / 1000}s)`);
  const loop = async () => {
    try {
      // Não espera as faciais terminarem: quem ainda está respondendo
      // simplesmente fica de fora deste ciclo.
      await startPolls(false);
    } catch (err) {
      console.error("[access-collector]", err);
    }
    collector.timer = setTimeout(loop, POLL_MS);
  };
  void loop();
}
