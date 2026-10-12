import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { readDatabaseSnapshot, type DataModule } from "./database-reader";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { databaseProvider } from "./postgres";

// A consulta e compartilhada apenas dentro da mesma renderizacao.
export const getDatabaseSnapshot = cache(
  async <M extends DataModule>(module: M) => {
    await connection();
    if (databaseProvider(process.env) === "postgres") {
      let bindings: unknown;
      try {
        bindings = getCloudflareContext().env;
      } catch {}
      if (bindings) {
        const config = z
          .object({
            HYPERDRIVE: z.object({ connectionString: z.string().min(1) }),
          })
          .safeParse(bindings);
        if (!config.success)
          throw new Error("Configure o binding HYPERDRIVE no Worker.");
        return readDatabaseSnapshot(module, process.env, fetch, {
          connectionString: config.data.HYPERDRIVE.connectionString,
        });
      }
    }
    return readDatabaseSnapshot(module);
  },
);
