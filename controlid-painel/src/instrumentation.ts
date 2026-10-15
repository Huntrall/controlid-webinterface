export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAccessCollector } = await import("./lib/access-collector");
    startAccessCollector();
  }
}
