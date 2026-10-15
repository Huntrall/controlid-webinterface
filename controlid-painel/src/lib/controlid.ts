export interface Device {
  id: string;
  name: string;
  baseUrl: string;
  login: string;
  password: string;
}

export interface DispatchResult {
  deviceId: string;
  deviceName: string;
  ok: boolean;
  message: string;
  data?: unknown;
}

export function cleanBaseUrl(url: string): string {
  let cleaned = (url || "").trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `http://${cleaned}`;
  }
  return cleaned.replace(/\/+$/, "");
}

const sessionCache = new Map<string, { session: string; ts: number }>();
const SESSION_TTL = 9 * 60 * 1000;

export function invalidateDeviceSession(deviceId: string): void {
  sessionCache.delete(deviceId);
}

async function getSession(device: Device): Promise<string> {
  const cached = sessionCache.get(device.id);
  if (cached && Date.now() - cached.ts < SESSION_TTL) return cached.session;

  const url = `${cleanBaseUrl(device.baseUrl)}/login.fcgi`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: device.login, password: device.password }),
      signal: AbortSignal.timeout(7000),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(`Tempo esgotado ao conectar em ${device.baseUrl} (dispositivo offline ou IP inacessível)`);
    }
    throw new Error(`Falha de rede ao conectar em ${device.baseUrl}: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
  }

  if (!res.ok) throw new Error(`Login falhou (HTTP ${res.status})`);
  const json = await res.json();
  if (!json.session) throw new Error("Login não retornou sessão válida");
  sessionCache.set(device.id, { session: json.session, ts: Date.now() });
  return json.session;
}

async function callJson(
  device: Device,
  endpoint: string,
  body: unknown,
  retried = false,
  timeoutMs = 10000
): Promise<unknown> {
  const session = await getSession(device);
  const baseUrl = cleanBaseUrl(device.baseUrl);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/${endpoint}?session=${session}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(`Tempo esgotado ao executar ${endpoint}`);
    }
    throw err;
  }
  if ((res.status === 401 || res.status === 403) && !retried) {
    invalidateDeviceSession(device.id);
    return callJson(device, endpoint, body, true, timeoutMs);
  }
  if (!res.ok) throw new Error(`${endpoint} → HTTP ${res.status}`);
  return res.json();
}

export interface UserPayload {
  id: number;
  registration: string;
  name: string;
  password?: string;
}

export async function createUser(device: Device, user: UserPayload): Promise<number> {
  const res = await callJson(device, "create_objects.fcgi", {
    object: "users",
    values: [{
      password: "",
      salt: "",
      begin_time: 0,
      end_time: 0,
      user_type_id: null,
      ...user,
    }],
  }) as { ids: number[] };
  return res.ids[0];
}

export function addUserToGroup(device: Device, userId: number, groupId = 1) {
  return callJson(device, "create_objects.fcgi", {
    object: "user_groups",
    values: [{ user_id: userId, group_id: groupId }],
  });
}

export async function setUserAlwaysAllowed(device: Device, userId: number): Promise<void> {
  // Step 0: discover portals (doors) on this device
  const portalsRes = await callJson(device, "load_objects.fcgi", {
    object: "portals",
    fields: ["id", "name"],
  }) as { portals: { id: number }[] };
  const portalIds = portalsRes.portals.map((p) => p.id);

  // Step 1: create a dedicated access rule for this user
  const ruleRes = await callJson(device, "create_objects.fcgi", {
    object: "access_rules",
    values: [{ name: `sempre permitido user ${userId}`, type: 1, priority: 0 }],
  }) as { ids: number[] };
  const ruleId = ruleRes.ids[0];

  // Step 2: link rule to all portals
  for (const portalId of portalIds) {
    await callJson(device, "create_objects.fcgi", {
      object: "portal_access_rules",
      values: [{ portal_id: portalId, access_rule_id: ruleId }],
    });
  }

  // Step 3: link user to rule
  await callJson(device, "create_objects.fcgi", {
    object: "user_access_rules",
    values: [{ user_id: userId, access_rule_id: ruleId }],
  });

  // Step 4: link time_zone_id=1 (factory "24h / always") to rule
  await callJson(device, "create_objects.fcgi", {
    object: "access_rule_time_zones",
    values: [{ access_rule_id: ruleId, time_zone_id: 1 }],
  });
}

export async function deleteUser(device: Device, userId: number): Promise<{ changes: number }> {
  // Remove face template first, then delete the user record
  await callJson(device, "user_destroy_image.fcgi", { user_ids: [userId] });
  const res = await callJson(device, "destroy_objects.fcgi", {
    object: "users",
    where: { users: { id: [userId] } },
  }) as { changes: number };
  if (res.changes === 0) throw new Error(`Usuário ${userId} não encontrado no dispositivo`);
  return res;
}

export async function getMaxUserId(device: Device): Promise<number> {
  const res = await callJson(device, "load_objects.fcgi", {
    object: "users",
    fields: ["id"],
  }) as { users: { id: number }[] };
  if (!res.users || res.users.length === 0) return 1;
  return Math.max(...res.users.map((u) => u.id));
}

export function listUsers(device: Device) {
  return callJson(device, "load_objects.fcgi", { object: "users" });
}

export interface DeviceAccessLog {
  id: number;
  time: number; // horário local do aparelho codificado como se fosse UTC
  event: number;
  user_id: number;
  portal_id: number;
}

// Logs com id > afterId (e opcionalmente time >= minDeviceTime), em ordem crescente.
export async function fetchAccessLogs(
  device: Device,
  opts: { afterId: number; minDeviceTime?: number; limit?: number }
): Promise<DeviceAccessLog[]> {
  const where: Record<string, unknown> = { id: { ">": opts.afterId } };
  if (opts.minDeviceTime) where.time = { ">=": opts.minDeviceTime };
  const res = await callJson(device, "load_objects.fcgi", {
    object: "access_logs",
    fields: ["id", "time", "event", "user_id", "portal_id"],
    where: { access_logs: where },
    order: ["id"],
    limit: opts.limit ?? 1000,
  }, false, 20000) as { access_logs?: DeviceAccessLog[] };
  return res.access_logs ?? [];
}

export async function getLatestAccessLogId(device: Device): Promise<number> {
  const res = await callJson(device, "load_objects.fcgi", {
    object: "access_logs",
    fields: ["id"],
    order: ["descending", "id"],
    limit: 1,
  }) as { access_logs?: { id: number }[] };
  return res.access_logs?.[0]?.id ?? 0;
}

// Relógio do aparelho (mesma codificação "local como UTC" dos logs).
export async function getDeviceClock(device: Device): Promise<number> {
  const res = await callJson(device, "system_information.fcgi", {}) as { time: number };
  return res.time;
}

export async function listPortals(device: Device): Promise<{ id: number; name: string }[]> {
  const res = await callJson(device, "load_objects.fcgi", {
    object: "portals",
    fields: ["id", "name"],
  }) as { portals?: { id: number; name: string }[] };
  return res.portals ?? [];
}

export async function listUserNames(
  device: Device,
  ids?: number[]
): Promise<{ id: number; name: string; registration: string }[]> {
  const res = await callJson(device, "load_objects.fcgi", {
    object: "users",
    fields: ["id", "name", "registration"],
    ...(ids ? { where: { users: { id: ids } } } : {}),
  }, false, 20000) as { users?: { id: number; name: string; registration: string }[] };
  return res.users ?? [];
}

export async function setUserPhoto(
  device: Device,
  userId: number,
  imageBytes: Buffer | Uint8Array
) {
  const session = await getSession(device);
  const baseUrl = cleanBaseUrl(device.baseUrl);
  const ts = Math.floor(Date.now() / 1000);
  const res = await fetch(
    `${baseUrl}/user_set_image.fcgi?user_id=${userId}&timestamp=${ts}&match=1&session=${session}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: imageBytes as BodyInit,
      signal: AbortSignal.timeout(15000),
    }
  );
  const json = await res.json();
  if (json.success === false) {
    throw new Error(json.errors?.[0]?.message ?? "Foto rejeitada pela facial");
  }
  return json;
}

export async function testConnection(
  device: Device
): Promise<{ ok: boolean; message: string }> {
  try {
    invalidateDeviceSession(device.id);
    await getSession(device);
    return { ok: true, message: "Conexão estabelecida com sucesso" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}

export async function testCustomConnection(params: {
  baseUrl: string;
  login: string;
  password?: string;
}): Promise<{ ok: boolean; message: string }> {
  const tempId = `temp-${Date.now()}`;
  try {
    const tempDevice: Device = {
      id: tempId,
      name: "Teste Temporário",
      baseUrl: cleanBaseUrl(params.baseUrl),
      login: params.login.trim(),
      password: params.password ?? "",
    };
    await getSession(tempDevice);
    invalidateDeviceSession(tempId);
    return { ok: true, message: "Conexão estabelecida com sucesso!" };
  } catch (err) {
    invalidateDeviceSession(tempId);
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
