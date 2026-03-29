import { setCors, verifyAuth, supabase } from "../_lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await verifyAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;

  try {
    const { data: gen, error: fetchError } = await supabase
      .from("generations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !gen) return res.status(404).json({ error: "Not found" });

    const filePath = `${userId}/${gen.image_url.split("/").pop()}`;
    await supabase.storage.from("generated-images").remove([filePath]);
    await supabase.from("generations").delete().eq("id", id);

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete" });
  }
}
