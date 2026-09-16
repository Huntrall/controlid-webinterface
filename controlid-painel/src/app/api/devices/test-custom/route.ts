import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { testCustomConnection } from "@/lib/controlid";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { deviceId, baseUrl, login, password } = await req.json();

  let effectivePassword = password;

  // If testing an existing device and no new password provided, use existing saved password
  if ((!effectivePassword || effectivePassword.trim() === "") && deviceId) {
    const existing = await db.device.findUnique({ where: { id: deviceId } });
    if (existing?.passwordEnc) {
      try {
        effectivePassword = decrypt(existing.passwordEnc);
      } catch {
        return NextResponse.json(
          { ok: false, message: "Falha ao decodificar a senha atual armazenada." },
          { status: 400 }
        );
      }
    }
  }

  if (!baseUrl || !login || !effectivePassword) {
    return NextResponse.json(
      { ok: false, message: "Endpoint, login e senha são necessários para o teste." },
      { status: 400 }
    );
  }

  const result = await testCustomConnection({
    baseUrl,
    login,
    password: effectivePassword,
  });

  return NextResponse.json(result);
}
