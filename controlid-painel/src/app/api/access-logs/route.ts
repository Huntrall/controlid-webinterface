import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCollectorStatus } from "@/lib/access-collector";
import { APP_TIMEZONE } from "@/lib/timezone";

// Feed ao vivo. Sem afterId devolve os últimos `limit` eventos; com afterId,
// só os que chegaram depois (o cliente chama isso a cada poucos segundos).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const afterId = Number(req.nextUrl.searchParams.get("afterId") ?? 0) || 0;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 100) || 100, 500);

  const rows = await db.accessEvent.findMany({
    where: afterId ? { id: { gt: afterId } } : undefined,
    orderBy: { id: "desc" },
    take: limit,
    include: { device: { select: { name: true } } },
  });

  return NextResponse.json({
    timeZone: APP_TIMEZONE,
    devices: getCollectorStatus(),
    events: rows.map((r) => ({
      id: r.id,
      time: r.time,
      event: r.event,
      direction: r.direction,
      deviceId: r.deviceId,
      deviceName: r.device.name,
      deviceUserId: r.deviceUserId,
      userName: r.userName,
      registration: r.registration,
    })),
  });
}
