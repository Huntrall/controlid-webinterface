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

const sessionCache = new Map<string, { session: string; ts: number }>();
const SESSION_TTL = 9 * 60 * 1000;

async function getSession(device: Device): Promise<string> {
  const cached = sessionCache.get(device.id);
  if (cached && Date.now() - cached.ts < SESSION_TTL) return cached.session;

  const res = await fetch(`${device.baseUrl}/login.fcgi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: device.login, password: device.password }),
  });
  if (!res.ok) throw new Error(`Login falhou (HTTP ${res.status})`);
  const json = await res.json();
  if (!json.session) throw new Error("Login não retornou sessão");
  sessionCache.set(device.id, { session: json.session, ts: Date.now() });
  return json.session;
}

async function callJson(
  device: Device,
  endpoint: string,
  body: unknown,
  retried = false
): Promise<unknown> {
  const session = await getSession(device);
  const res = await fetch(`${device.baseUrl}/${endpoint}?session=${session}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if ((res.status === 401 || res.status === 403) && !retried) {
    sessionCache.delete(device.id);
    return callJson(device, endpoint, body, true);
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

export function listUsers(device: Device) {
  return callJson(device, "load_objects.fcgi", { object: "users" });
}

export async function setUserPhoto(
  device: Device,
  userId: number,
  imageBytes: Buffer | Uint8Array
) {
  const session = await getSession(device);
  const ts = Math.floor(Date.now() / 1000);
  const res = await fetch(
    `${device.baseUrl}/user_set_image.fcgi?user_id=${userId}&timestamp=${ts}&match=1&session=${session}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: imageBytes as BodyInit,
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
    await getSession(device);
    return { ok: true, message: "Conexão estabelecida com sucesso" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
