import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { testConnection } from "@/lib/controlid";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const device = await db.device.findUnique({ where: { id } });
  if (!device) return NextResponse.json({ error: "Dispositivo não encontrado" }, { status: 404 });

  const result = await testConnection({
    id: device.id,
    name: device.name,
    baseUrl: device.baseUrl,
    login: device.login,
    password: decrypt(device.passwordEnc),
  });

  return NextResponse.json(result);
}
