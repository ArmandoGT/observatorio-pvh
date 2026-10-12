export function supabaseConfig(env: Record<string, string | undefined>) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;
  if (!url && !key && env.SUPABASE_REQUIRED !== "true") return null;
  if (!url || !key)
    throw new Error(
      "Configure SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente do servidor.",
    );
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("SUPABASE_URL deve ser um endereco HTTPS sem credenciais.");
  if (!(key.startsWith("sb_secret_") || key.startsWith("eyJ")))
    throw new Error(
      "Use uma chave secreta de servidor, nunca a publishable key.",
    );
  if (key.startsWith("eyJ")) {
    let role: unknown;
    try {
      role = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString(),
      ).role;
    } catch {}
    if (role !== "service_role")
      throw new Error("A chave JWT do servidor precisa ser service_role.");
  }
  return { url: parsed.origin, key };
}
