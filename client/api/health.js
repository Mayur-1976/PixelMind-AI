export default async function handler(req, res) {
  // Only report boolean presence — never leak key values or prefixes
  const checks = {
    clerkKey: !!process.env.CLERK_SECRET_KEY,
    supabaseUrl: !!process.env.SUPABASE_URL,
    supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    picsartKey: !!process.env.PICSART_API_KEY,
    status: "ok",
  };

  res.json(checks);
}
