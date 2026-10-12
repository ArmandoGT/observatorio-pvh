import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { readDatabaseSnapshot, type DataModule } from "./database-reader";

// A consulta e compartilhada apenas dentro da mesma renderizacao.
export const getDatabaseSnapshot = cache(
  async <M extends DataModule>(module: M) => {
    await connection();
    return readDatabaseSnapshot(module);
  },
);
