import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env") });

import { hash } from "bcryptjs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma";

function createDb() {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  const filePath = raw.startsWith("file:") ? raw.slice(5) : raw;
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const adapter = new PrismaLibSql({ url: `file:${abs}` });
  return new PrismaClient({ adapter });
}

const db = createDb();

const EMAIL = process.argv[2] ?? "admin@local.com";
const PASSWORD = process.argv[3] ?? "admin123";
const NAME = process.argv[4] ?? "Administrador";

async function main() {
  const passwordHash = await hash(PASSWORD, 12);
  const user = await db.panelUser.upsert({
    where: { email: EMAIL },
    update: { passwordHash, name: NAME },
    create: { email: EMAIL, passwordHash, name: NAME },
  });
  console.log(`✅ Usuário criado: ${user.email}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
