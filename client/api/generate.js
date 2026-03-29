import { setCors, verifyAuth, supabase } from "./_lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await verifyAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized — Clerk token verification failed. Check CLERK_SECRET_KEY env var." });
  }

  const { prompt, style } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const finalPrompt = style ? `${prompt}, style: ${style}` : prompt;

  try {
    // Call Picsart Text2Image API
    const response = await fetch("https://genai-api.picsart.io/v1/text2image", {
      method: "POST",
      headers: {
        accept: "application/json",
        "x-picsart-api-key": process.env.PICSART_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        width: 1024,
        height: 1024,
        count: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Picsart API Error:", response.status, errorText);
      return res.status(response.status).json({ error: "Image generation failed" });
    }

    const initResult = await response.json();
    console.log("Picsart response:", JSON.stringify(initResult, null, 2));

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

    let imageUrl = findImageUrl(initResult);

    // Poll if async
    if (!imageUrl && initResult.inference_id) {
      const inferenceId = initResult.inference_id;
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        try {
          const pollResponse = await fetch(
            `https://genai-api.picsart.io/v1/text2image/inferences/${inferenceId}`,
            {
              headers: {
                accept: "application/json",
                "x-picsart-api-key": process.env.PICSART_API_KEY,
              },
            }
          );
          if (!pollResponse.ok) continue;
          const pollResult = await pollResponse.json();
          if (pollResult.status === "failed") {
            return res.status(500).json({ error: "Image generation failed" });
          }
          imageUrl = findImageUrl(pollResult);
          if (imageUrl) break;
        } catch (pollErr) {
          console.error("Poll error:", pollErr.message);
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: "Image generation timed out" });
    }

    // Download and upload to Supabase
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
      .insert({ user_id: userId, prompt, style: style || null, image_url: publicUrl })
      .select()
      .single();

    if (dbError) {
      console.error(dbError);
      return res.status(500).json({ error: "Database error" });
    }

    return res.json({ imageUrl: publicUrl, generation });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Generation failed" });
  }
}
