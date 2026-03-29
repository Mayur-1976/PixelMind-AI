export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  const checks = {
    clerkKey: !!process.env.CLERK_SECRET_KEY,
    supabaseUrl: !!process.env.SUPABASE_URL,
    supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY 
      ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + "..." 
      : "MISSING",
    picsartKey: !!process.env.PICSART_API_KEY,
    supabaseTest: null,
  };

  // Actually test the Supabase connection
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await supabase.from("generations").select("id").limit(1);
      if (error) {
        checks.supabaseTest = "FAILED: " + error.message;
      } else {
        checks.supabaseTest = "OK - connected successfully";
      }
    } catch (err) {
      checks.supabaseTest = "CRASH: " + err.message;
    }
  }

  res.json(checks);
}
