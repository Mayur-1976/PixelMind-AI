import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:5173", "http://localhost:4173"];
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    supabaseUrl: process.env.SUPABASE_URL ? "set" : "MISSING",
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 10) + "..." : "MISSING",
    picsartKey: process.env.PICSART_API_KEY ? "set" : "MISSING",
  });
});
app.use(express.json());

// Add the Clerk middleware before any requireAuth endpoints
app.use(clerkMiddleware());

const supabase = createClient(
  process.env.SUPABASE_URL || "http://placeholder",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

app.post("/api/generate", requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  const { prompt, style } = req.body;

  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const finalPrompt = style ? `${prompt}, style: ${style}` : prompt;

  try {
    // Call Picsart Text2Image API
    const response = await fetch("https://genai-api.picsart.io/v1/text2image", {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'x-picsart-api-key': process.env.PICSART_API_KEY,
        'content-type': 'application/json',
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

    // Helper: recursively find any image URL in the response object
    function findImageUrl(obj) {
      if (!obj || typeof obj !== 'object') return null;
      if (typeof obj.url === 'string' && obj.url.startsWith('http')) return obj.url;
      for (const value of Object.values(obj)) {
        if (typeof value === 'string' && value.startsWith('https://cdn')) return value;
        if (typeof value === 'object') {
          const found = findImageUrl(value);
          if (found) return found;
        }
      }
      return null;
    }

    // Try to find image URL directly in the initial response
    let imageUrl = findImageUrl(initResult);

    // If no image URL found and we have an inference_id, poll for results
    if (!imageUrl && initResult.inference_id) {
      const inferenceId = initResult.inference_id;
      console.log("Polling for inference:", inferenceId);

      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
          const pollResponse = await fetch(
            `https://genai-api.picsart.io/v1/text2image/inferences/${inferenceId}`,
            {
              headers: {
                'accept': 'application/json',
                'x-picsart-api-key': process.env.PICSART_API_KEY,
              },
            }
          );

          if (!pollResponse.ok) {
            console.error("Poll error:", pollResponse.status);
            continue;
          }

          const pollResult = await pollResponse.json();
          console.log(`Poll ${i + 1}:`, JSON.stringify(pollResult, null, 2));

          if (pollResult.status === "failed") {
            return res.status(500).json({ error: "Image generation failed" });
          }

          imageUrl = findImageUrl(pollResult);
          if (imageUrl) break;
        } catch (pollErr) {
          console.error("Poll fetch error:", pollErr.message);
        }
      }
    }

    if (!imageUrl) {
      console.error("Could not find image URL in response:", initResult);
      return res.status(500).json({ error: "Image generation timed out" });
    }

    console.log("Found image URL:", imageUrl);

    // Download the generated image from Picsart CDN
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${userId}/${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from("generated-images")
          .upload(fileName, buffer, { contentType: "image/png" });
        
        if (uploadError) {
            console.error(uploadError);
            return res.status(500).json({ error: "Failed to upload image" })
        }

        const { data: { publicUrl } } = supabase.storage
          .from("generated-images")
          .getPublicUrl(fileName);

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
    res.status(500).json({ error: "Generation failed" });
  }
});

app.get("/api/generations", requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  console.log("[GET /api/generations] userId:", userId);

  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[Supabase generations error]", JSON.stringify(error, null, 2));
    return res.status(500).json({ error: error.message });
  }
  console.log("[GET /api/generations] returned", data?.length, "rows");
  res.json({ generations: data });
});

app.delete("/api/generations/:id", requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  const { id } = req.params;

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

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
