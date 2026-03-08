import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
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
    // Call Stability AI API
    const formData = new FormData();
    formData.append('prompt', finalPrompt);
    formData.append('output_format', 'png');

    const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: "image/*"
      },
      body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Stability API Error:", errorText);
        return res.status(response.status).json({ error: "Image generation failed" });
    }

    const arrayBuffer = await response.arrayBuffer();
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

  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
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

app.listen(3001, () => console.log("Server running on port 3001"));
