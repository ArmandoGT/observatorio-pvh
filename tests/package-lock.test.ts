import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

interface LockedPackage {
  version?: string;
  optionalDependencies?: Record<string, string>;
}

test("lockfile preserva dependencias nativas para Windows, Linux e macOS", async () => {
  const lock: { packages: Record<string, LockedPackage> } = JSON.parse(
    await readFile("package-lock.json", "utf8"),
  );
  const nativeParents = Object.entries(lock.packages).filter(([key]) =>
    /node_modules\/(?:@ast-grep\/napi|esbuild|next|sharp|supabase|workerd|tsx|@img\/sharp-[^/]+)$/.test(
      key,
    ),
  );
  assert.ok(nativeParents.length >= 6);
  for (const [key, parent] of nativeParents) {
    for (const [name, version] of Object.entries(
      parent.optionalDependencies ?? {},
    )) {
      let prefix = key;
      let dependency: LockedPackage | undefined;
      while (prefix) {
        dependency = lock.packages[`${prefix}/node_modules/${name}`];
        if (dependency) break;
        prefix = prefix
          .slice(0, prefix.lastIndexOf("node_modules/"))
          .replace(/\/$/, "");
      }
      dependency ??= lock.packages[`node_modules/${name}`];
      assert.ok(dependency, `${name}@${version} ausente no lockfile (${key})`);
      if (/^\d+\.\d+\.\d+(?:[-+].+)?$/.test(version))
        assert.equal(
          dependency.version,
          version,
          `${name}: versao nativa divergente`,
        );
    }
  }
});
