import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { deleteUser } from "@/lib/controlid";
import { dispatch } from "@/lib/dispatch";
import type { Device } from "@/lib/controlid";
import fs from "fs/promises";
import path from "path";

const STORAGE = path.join(process.cwd(), "storage", "photos");

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const dbDevices = await db.device.findMany({ where: { active: true } });
  const devices: Device[] = dbDevices.map((d) => ({
    id: d.id,
    name: d.name,
    baseUrl: d.baseUrl,
    login: d.login,
    password: decrypt(d.passwordEnc),
  }));

  const deviceId = user.deviceUserId ?? user.id;
  const deleteResults = await dispatch(devices, (d) => deleteUser(d, deviceId));

  // Log results
  for (const r of deleteResults) {
    await db.dispatchLog.create({
      data: {
        userId,
        deviceId: r.deviceId,
        action: "delete_user",
        ok: r.ok,
        message: r.message,
      },
    });
  }

  // Remove from our DB only if all devices succeeded (or no devices)
  const allOk = deleteResults.every((r) => r.ok);
  if (allOk || devices.length === 0) {
    if (user.photoPath) {
      await fs.unlink(path.join(STORAGE, user.photoPath)).catch(() => {});
    }
    await db.user.delete({ where: { id: userId } });
  }

  return NextResponse.json({ deleteResults, removedFromDb: allOk || devices.length === 0 });
}
