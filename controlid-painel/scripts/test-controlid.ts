import { testConnection, listUsers } from "../src/lib/controlid";
import type { Device } from "../src/lib/controlid";

const devices: Device[] = [
  {
    id: "01",
    name: "Catraca 2 - Entrada",
    baseUrl: "http://192.168.20.102",
    login: "admin",
    password: "1qaz2wsx",
  },
  {
    id: "02",
    name: "Catraca 1 - Entrada",
    baseUrl: "http://192.168.20.103",
    login: "admin",
    password: "1qaz2wsx",
  },
  {
    id: "03",
    name: "Portão - Entrada",
    baseUrl: "http://192.168.20.129",
    login: "admin",
    password: "1qaz2wsx",
  },
];

async function main() {
  for (const device of devices) {
    console.log(`\nTestando: ${device.name} (${device.baseUrl})`);
    const conn = await testConnection(device);
    if (!conn.ok) {
      console.error(`  ❌ ${conn.message}`);
      continue;
    }
    console.log(`  ✅ ${conn.message}`);
    const users = (await listUsers(device)) as { users?: unknown[] };
    console.log(`  👥 Usuários: ${users?.users?.length ?? 0}`);
  }
}

main().catch((err) => {
  console.error("❌ Erro inesperado:", err.message);
  process.exit(1);
});