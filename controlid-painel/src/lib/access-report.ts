import { db } from "./db";
import { APP_TIMEZONE, dayRange, todayIn } from "./timezone";

const GRANTED = 7;

interface Passage {
  time: number;
  direction: string;
  deviceId: string;
  deviceName: string;
  // false = leitura de portão desconsiderada porque a pessoa tem leitura
  // nas catracas no mesmo dia (portão costuma ser segurado para outros).
  counted: boolean;
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
      deviceId: true,
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
    // Leitura repetida na mesma facial e direção em menos de 1 min: ignora.
    const dup = p.passages.findLast((x) => x.deviceId === r.deviceId);
    if (dup && dup.direction === r.direction && r.time - dup.time < 60) continue;
    p.passages.push({
      time: r.time,
      direction: r.direction,
      deviceId: r.deviceId,
      deviceName: r.device.name,
      counted: true,
    });
  }

  let entries = 0;
  let exits = 0;
  let inside = 0;

  const result = [...people.values()].map((p) => {
    // Catraca manda: se a pessoa passou por alguma catraca no dia, o portão
    // vira só informativo. Sem catraca, o portão é o que temos.
    const hasTurnstile = p.passages.some((x) => x.direction !== "pass");
    if (hasTurnstile) for (const x of p.passages) x.counted = x.direction !== "pass";
    const counted = p.passages.filter((x) => x.counted);

    const firstIn = counted.find((x) => x.direction !== "exit");
    const lastOut = counted.findLast((x) => x.direction === "exit");
    const last = counted[counted.length - 1];
    const isInside = last.direction !== "exit";
    for (const x of counted) {
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
