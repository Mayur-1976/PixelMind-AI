import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

// Only create supabase client if env vars exist
export const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// CORS headers for all API responses
export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Verify Clerk JWT and return userId
export async function verifyAuth(req) {
  try {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("No Bearer token found. Headers:", JSON.stringify(Object.keys(req.headers)));
      return null;
    }
    const token = authHeader.split(" ")[1];

    if (!process.env.CLERK_SECRET_KEY) {
      console.error("CLERK_SECRET_KEY is not set!");
      return null;
    }

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    return payload.sub; // userId
  } catch (err) {
    console.error("Auth verification failed:", err.message || err);
    return null;
  }
}
