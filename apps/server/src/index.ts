import { closeDatabase } from "@lobe/db";

import { app } from "./app";
import { serverConfig } from "./config";
import { initializeWorker, startWorker } from "./worker";

export { app } from "./app";
export { processNextJob } from "./worker";

if (import.meta.main) {
  await initializeWorker();

  const workerController = new AbortController();
  startWorker(workerController.signal);

  const server = Bun.serve({
    port: serverConfig.port,
    fetch: app.fetch,
  });

  console.log(`Lobe server listening on http://localhost:${server.port}`);

  const shutdown = async () => {
    workerController.abort();
    await server.stop();
    await closeDatabase();
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}
