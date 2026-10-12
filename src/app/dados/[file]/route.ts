import { getDatabaseSnapshot } from "@/lib/database";
import type { DataModule } from "@/lib/database-reader";

const downloads = new Map<string, DataModule>([
  ["obras.json", "obras-pvh"],
  ["contratos.json", "contratos-pvh"],
  ["receitas.json", "receitas-pvh"],
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const module = downloads.get(file);
  if (!module) return new Response(null, { status: 404 });
  try {
    const snapshot = await getDatabaseSnapshot(module);
    return Response.json(snapshot, {
      headers: {
        "Content-Disposition": `attachment; filename="${file}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "A base está indisponível. Tente novamente mais tarde." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
