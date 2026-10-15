// Fuso usado para definir "o dia" nos relatórios de acesso.
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Sao_Paulo";

function offsetSeconds(epochSec: number, timeZone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(new Date(epochSec * 1000))
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 3600 + Number(m[3] ?? 0) * 60);
}

// "YYYY-MM-DD" de hoje no fuso informado.
export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

// Intervalo [início, fim) em Unix segundos do dia "YYYY-MM-DD" no fuso.
export function dayRange(date: string, timeZone: string): [number, number] {
  const [y, mo, d] = date.split("-").map(Number);
  const utcMidnight = Date.UTC(y, mo - 1, d) / 1000;
  const start = utcMidnight - offsetSeconds(utcMidnight, timeZone);
  const nextUtcMidnight = utcMidnight + 86400;
  const end = nextUtcMidnight - offsetSeconds(nextUtcMidnight, timeZone);
  return [start, end];
}
