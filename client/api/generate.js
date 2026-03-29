import { setCors, verifyAuth, supabase } from "./_lib/auth.js";

// Helper: recursively find any image URL in the response object
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
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { prompt, style } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const finalPrompt = style ? `${prompt}, style: ${style}` : prompt;

  try {
    // Step 1: Send request to Picsart
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

    // Step 2: Check if image is already ready (synchronous response)
    const imageUrl = findImageUrl(initResult);

    if (imageUrl) {
      // Image ready immediately — save to Supabase and return
      const result = await saveImage(userId, imageUrl, prompt, style);
      return res.json(result);
    }

    // Step 3: Image not ready yet — return the inference_id for polling
    if (initResult.inference_id) {
      return res.json({
        status: "processing",
        inferenceId: initResult.inference_id,
        prompt,
        style: style || null,
      });
    }

    return res.status(500).json({ error: "Unexpected API response" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Generation failed" });
  }
}

// Save image to Supabase storage and database
async function saveImage(userId, imageUrl, prompt, style) {
  const imageResponse = await fetch(imageUrl);
  const arrayBuffer = await imageResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `${userId}/${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from("generated-images")
    .upload(fileName, buffer, { contentType: "image/png" });

  if (uploadError) {
    console.error(uploadError);
    throw new Error("Failed to upload image");
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
    throw new Error("Database error");
  }

  return { imageUrl: publicUrl, generation };
}
