import pLimit from "p-limit";
import type { Device, DispatchResult } from "./controlid";

export async function dispatch<T>(
  devices: Device[],
  action: (d: Device) => Promise<T>,
  concurrency = 5
): Promise<DispatchResult[]> {
  const limit = pLimit(concurrency);
  const settled = await Promise.allSettled(
    devices.map((d) => limit(() => action(d)))
  );
  return settled.map((r, i) => ({
    deviceId: devices[i].id,
    deviceName: devices[i].name,
    ok: r.status === "fulfilled",
    message:
      r.status === "fulfilled" ? "OK" : (r.reason as Error).message,
    data: r.status === "fulfilled" ? r.value : undefined,
  }));
}
