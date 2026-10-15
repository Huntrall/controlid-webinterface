import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDayReport } from "@/lib/access-report";
import { APP_TIMEZONE, todayIn } from "@/lib/timezone";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const param = req.nextUrl.searchParams.get("date");
  const date = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : todayIn(APP_TIMEZONE);
  return NextResponse.json(await getDayReport(date));
}
