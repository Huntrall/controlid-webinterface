import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { collectNow, getCollectorStatus } from "@/lib/access-collector";

// Força uma coleta imediata em todas as faciais (inclusive as que estavam
// em espera por estarem offline).
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const synced = await collectNow();
  return NextResponse.json({ success: true, synced, devices: getCollectorStatus() });
}
