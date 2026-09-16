import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { cleanBaseUrl, invalidateDeviceSession } from "@/lib/controlid";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const existing = await db.device.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Dispositivo não encontrado" }, { status: 404 });
  }

  const { name, baseUrl, login, password, active } = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) {
    data.name = name.trim();
  }
  if (typeof baseUrl === "string" && baseUrl.trim()) {
    data.baseUrl = cleanBaseUrl(baseUrl);
  }
  if (typeof login === "string" && login.trim()) {
    data.login = login.trim();
  }
  if (typeof password === "string" && password.trim()) {
    data.passwordEnc = encrypt(password);
  }
  if (typeof active === "boolean") {
    data.active = active;
  }

  // Clear any existing cached session for this device
  invalidateDeviceSession(id);

  const device = await db.device.update({
    where: { id },
    data,
    select: { id: true, name: true, baseUrl: true, login: true, active: true, createdAt: true },
  });

  return NextResponse.json(device);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const existing = await db.device.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Dispositivo não encontrado" }, { status: 404 });
  }

  // Clear cached session
  invalidateDeviceSession(id);

  // Safely delete dispatch logs and device in a single atomic transaction
  await db.$transaction([
    db.dispatchLog.deleteMany({ where: { deviceId: id } }),
    db.device.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true, message: "Dispositivo removido com sucesso" });
}
