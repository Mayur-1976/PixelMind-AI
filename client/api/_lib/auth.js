import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CORS headers for all API responses
export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Verify Clerk JWT and return userId
export async function verifyAuth(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("No Bearer token found in headers:", Object.keys(req.headers));
    return null;
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    console.log("Auth verified, userId:", payload.sub);
    return payload.sub; // userId
  } catch (err) {
    console.error("Auth verification failed:", err.message);
    return null;
  }
}
