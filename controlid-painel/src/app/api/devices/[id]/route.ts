import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const { name, baseUrl, login, password } = await req.json();

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (baseUrl) data.baseUrl = baseUrl;
  if (login) data.login = login;
  if (password) data.passwordEnc = encrypt(password);

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
  await db.device.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
