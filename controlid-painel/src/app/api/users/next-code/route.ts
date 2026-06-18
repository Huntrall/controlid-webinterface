import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getMaxUserId } from "@/lib/controlid";
import type { Device } from "@/lib/controlid";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbDevices = await db.device.findMany({ where: { active: true } });
  if (dbDevices.length === 0) return NextResponse.json({ nextCode: 2 });

  const devices: Device[] = dbDevices.map((d) => ({
    id: d.id,
    name: d.name,
    baseUrl: d.baseUrl,
    login: d.login,
    password: decrypt(d.passwordEnc),
  }));

  const results = await Promise.allSettled(devices.map((d) => getMaxUserId(d)));
  const maxIds = results
    .filter((r): r is PromiseFulfilledResult<number> => r.status === "fulfilled")
    .map((r) => r.value);

  const globalMax = maxIds.length > 0 ? Math.max(...maxIds) : 1;
  return NextResponse.json({ nextCode: Math.max(globalMax + 1, 2) });
}
