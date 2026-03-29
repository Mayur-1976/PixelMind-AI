import { setCors, verifyAuth, supabase } from "./_lib/auth.js";

function findImageUrl(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (typeof obj.url === "string" && obj.url.startsWith("http")) return obj.url;
  for (const value of Object.values(obj)) {
    if (typeof value === "string" && value.startsWith("https://cdn")) return value;
    if (typeof value === "object") {
      const found = findImageUrl(value);
      if (found) return found;
    }
  }
  return null;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await verifyAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { inferenceId, prompt, style } = req.body;
  if (!inferenceId) return res.status(400).json({ error: "inferenceId is required" });

  try {
    // Check Picsart for the result
    const pollResponse = await fetch(
      `https://genai-api.picsart.io/v1/text2image/inferences/${inferenceId}`,
      {
        headers: {
          accept: "application/json",
          "x-picsart-api-key": process.env.PICSART_API_KEY,
        },
      }
    );

    if (!pollResponse.ok) {
      return res.json({ status: "processing" });
    }

    const pollResult = await pollResponse.json();

    if (pollResult.status === "failed") {
      return res.status(500).json({ status: "failed", error: "Image generation failed" });
    }

    const imageUrl = findImageUrl(pollResult);

    if (!imageUrl) {
      // Still processing
      return res.json({ status: "processing" });
    }

    // Image is ready! Download and save to Supabase
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${userId}/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(fileName, buffer, { contentType: "image/png" });

    if (uploadError) {
      console.error(uploadError);
      return res.status(500).json({ error: "Failed to upload image" });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("generated-images").getPublicUrl(fileName);

    const { data: generation, error: dbError } = await supabase
      .from("generations")
      .insert({ user_id: userId, prompt: prompt || "", style: style || null, image_url: publicUrl })
      .select()
      .single();

    if (dbError) {
      console.error(dbError);
      return res.status(500).json({ error: "Database error" });
    }

    return res.json({ status: "completed", imageUrl: publicUrl, generation });
  } catch (err) {
    console.error("Poll error:", err);
    return res.status(500).json({ error: "Poll failed" });
  }
}
