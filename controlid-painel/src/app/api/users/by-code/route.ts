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

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { deviceUserId: raw } = await req.json();
  const deviceUserId = parseInt(raw, 10);
  if (isNaN(deviceUserId) || deviceUserId < 1) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const dbDevices = await db.device.findMany({ where: { active: true } });
  const devices: Device[] = dbDevices.map((d) => ({
    id: d.id,
    name: d.name,
    baseUrl: d.baseUrl,
    login: d.login,
    password: decrypt(d.passwordEnc),
  }));

  const deleteResults = await dispatch(devices, (d) => deleteUser(d, deviceUserId));

  // If user exists in our DB, remove them when all devices succeed
  const dbUser = await db.user.findUnique({ where: { deviceUserId } });
  const allOk = deleteResults.every((r) => r.ok);
  let removedFromDb = false;

  if (dbUser && (allOk || devices.length === 0)) {
    if (dbUser.photoPath) {
      await fs.unlink(path.join(STORAGE, dbUser.photoPath)).catch(() => {});
    }
    for (const r of deleteResults) {
      await db.dispatchLog.create({
        data: {
          userId: dbUser.id,
          deviceId: r.deviceId,
          action: "delete_user",
          ok: r.ok,
          message: r.message,
        },
      });
    }
    await db.user.delete({ where: { id: dbUser.id } });
    removedFromDb = true;
  }

  return NextResponse.json({ deleteResults, removedFromDb, foundInDb: !!dbUser });
}
