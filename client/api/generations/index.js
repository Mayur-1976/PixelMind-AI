import { setCors, verifyAuth, supabase } from "./_lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabase) {
    return res.status(500).json({ error: "Server misconfigured — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing" });
  }

  const userId = await verifyAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { data, error } = await supabase
      .from("generations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[Supabase error]", JSON.stringify(error, null, 2));
      return res.status(500).json({ error: error.message });
    }
    return res.json({ generations: data || [] });
  } catch (err) {
    console.error("[generations] Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
