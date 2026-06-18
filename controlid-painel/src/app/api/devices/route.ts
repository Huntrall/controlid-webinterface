import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const devices = await db.device.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, baseUrl: true, login: true, active: true, createdAt: true },
  });
  return NextResponse.json(devices);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { name, baseUrl, login, password } = await req.json();
  if (!name || !baseUrl || !login || !password) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  const device = await db.device.create({
    data: { name, baseUrl, login, passwordEnc: encrypt(password) },
    select: { id: true, name: true, baseUrl: true, login: true, active: true, createdAt: true },
  });
  return NextResponse.json(device, { status: 201 });
}
