import { db } from "./db";
import { APP_TIMEZONE, dayRange, todayIn } from "./timezone";

const GRANTED = 7;

interface Passage {
  time: number;
  direction: string;
  deviceName: string;
}

// Resumo de presença por colaborador em um dia: chegada, última saída,
// se ainda está no local e a linha do tempo de passagens.
export async function getDayReport(date: string) {
  const [start, end] = dayRange(date, APP_TIMEZONE);

  const rows = await db.accessEvent.findMany({
    where: { time: { gte: start, lt: end }, event: GRANTED },
    orderBy: { time: "asc" },
    select: {
      time: true,
      direction: true,
      deviceUserId: true,
      userName: true,
      registration: true,
      device: { select: { name: true } },
    },
  });

  const people = new Map<number, {
    deviceUserId: number;
    name: string;
    registration: string | null;
    passages: Passage[];
  }>();

  for (const r of rows) {
    let p = people.get(r.deviceUserId);
    if (!p) {
      p = { deviceUserId: r.deviceUserId, name: r.userName, registration: r.registration, passages: [] };
      people.set(r.deviceUserId, p);
    }
    const prev = p.passages[p.passages.length - 1];
    // Leitura repetida na mesma direção em menos de 1 min: ignora.
    if (prev && prev.direction === r.direction && r.time - prev.time < 60) continue;
    // Portão seguido da catraca de entrada é uma única chegada; fica o
    // horário do portão, que é quando a pessoa chegou de fato.
    if (prev && prev.direction === "pass" && r.direction === "entry" && r.time - prev.time < 180) {
      prev.direction = "entry";
      prev.deviceName = `${prev.deviceName} → ${r.device.name}`;
      continue;
    }
    p.passages.push({ time: r.time, direction: r.direction, deviceName: r.device.name });
  }

  let entries = 0;
  let exits = 0;
  let inside = 0;

  const result = [...people.values()].map((p) => {
    const firstIn = p.passages.find((x) => x.direction !== "exit");
    const lastOut = [...p.passages].reverse().find((x) => x.direction === "exit");
    const last = p.passages[p.passages.length - 1];
    const isInside = last.direction !== "exit";
    for (const x of p.passages) {
      if (x.direction === "exit") exits++;
      else entries++;
    }
    if (isInside) inside++;
    return {
      ...p,
      firstIn: firstIn?.time ?? null,
      lastOut: lastOut && (!firstIn || lastOut.time > firstIn.time) ? lastOut.time : null,
      lastTime: last.time,
      inside: isInside,
    };
  });

  return {
    date,
    timeZone: APP_TIMEZONE,
    isToday: date === todayIn(APP_TIMEZONE),
    totals: { people: result.length, entries, exits, inside },
    people: result,
  };
}
