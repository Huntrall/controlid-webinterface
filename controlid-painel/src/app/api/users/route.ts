import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { createUser, setUserPhoto, addUserToGroup, setUserAlwaysAllowed } from "@/lib/controlid";
import { dispatch } from "@/lib/dispatch";
import type { Device } from "@/lib/controlid";
import fs from "fs/promises";
import path from "path";

const STORAGE = path.join(process.cwd(), "storage", "photos");

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const form = await req.formData();
  const deviceUserIdRaw = form.get("deviceUserId") as string;
  const registration = form.get("registration") as string;
  const name = form.get("name") as string;
  const deviceIds = JSON.parse((form.get("deviceIds") as string) ?? "[]") as string[];
  const photo = form.get("photo") as File | null;

  const deviceUserId = parseInt(deviceUserIdRaw, 10);
  if (!registration || !name || deviceIds.length === 0 || isNaN(deviceUserId)) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  // Check for duplicates before creating
  const existing = await db.user.findFirst({
    where: { OR: [{ deviceUserId }, { registration }] },
  });
  if (existing) {
    const field = existing.deviceUserId === deviceUserId ? "Código na facial" : "Matrícula";
    return NextResponse.json(
      { error: `${field} já cadastrado no sistema` },
      { status: 409 }
    );
  }

  let user: Awaited<ReturnType<typeof db.user.create>> | null = null;

  try {
    user = await db.user.create({ data: { deviceUserId, registration, name } });

    let photoBuffer: Buffer | null = null;
    if (photo && photo.size > 0) {
      const bytes = await photo.arrayBuffer();
      photoBuffer = Buffer.from(bytes);
      await fs.mkdir(STORAGE, { recursive: true });
      await fs.writeFile(path.join(STORAGE, `${user.id}.jpg`), photoBuffer);
      await db.user.update({ where: { id: user.id }, data: { photoPath: `${user.id}.jpg` } });
    }

    const dbDevices = await db.device.findMany({ where: { id: { in: deviceIds } } });
    const devices: Device[] = dbDevices.map((d) => ({
      id: d.id,
      name: d.name,
      baseUrl: d.baseUrl,
      login: d.login,
      password: decrypt(d.passwordEnc),
    }));

    const createResults = await dispatch(devices, (d) =>
      createUser(d, { id: deviceUserId, registration, name })
    );

    const okDevices = devices.filter((d) => createResults.find((r) => r.deviceId === d.id && r.ok));

    let photoResults = null;
    if (photoBuffer && okDevices.length > 0) {
      const buf = photoBuffer;
      photoResults = await dispatch(okDevices, (d) => setUserPhoto(d, deviceUserId, buf));
    }

    const groupResults = await dispatch(okDevices, (d) => addUserToGroup(d, deviceUserId));
    const accessResults = await dispatch(okDevices, (d) => setUserAlwaysAllowed(d, deviceUserId));

    const toLog: Array<{ action: string; results: typeof createResults }> = [
      { action: "create_user", results: createResults },
      { action: "set_photo", results: photoResults ?? [] },
      { action: "add_group", results: groupResults },
      { action: "set_access", results: accessResults },
    ];
    for (const { action, results } of toLog) {
      for (const r of results) {
        await db.dispatchLog.create({
          data: { userId: user.id, deviceId: r.deviceId, action, ok: r.ok, message: r.message },
        });
      }
    }

    return NextResponse.json({ user, createResults, photoResults, groupResults, accessResults });
  } catch (err) {
    // If DB user was created but dispatch crashed, remove the orphan record
    if (user) {
      await db.user.delete({ where: { id: user.id } }).catch(() => {});
    }
    console.error("[POST /api/users]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
