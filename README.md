# PixelMind AI - Text-to-Image SaaS

A complete Text-to-Image SaaS web application with authentication, database storage, and AI image generation.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Auth:** Clerk
- **Image Generation:** Stability AI (stable-image-core)
- **Database & Storage:** Supabase

## Why Clerk?
- Clerk handles ALL auth UI — no need to build Login/Signup pages manually.
- Provides prebuilt `<SignIn />`, `<SignUp />`, `<UserButton />` components.
- Handles JWT tokens, sessions, OAuth (Google, GitHub, etc.) automatically.
- Just wrap the app in `<ClerkProvider>` and you're done!

---

## 1. Clerk Setup
1. Go to [Clerk](https://clerk.com) and create an application.
2. Copy the **Publishable Key** and place it in `client/.env` as `VITE_CLERK_PUBLISHABLE_KEY`.
3. Copy the **Secret Key** and place it in `server/.env` as `CLERK_SECRET_KEY`.
4. (Optional) Enable Google/GitHub OAuth in your Clerk dashboard.

## 2. Supabase Setup
1. Go to [Supabase](https://supabase.com) and create a project.
2. Run the following SQL in the Supabase SQL Editor:
```sql
CREATE TABLE generations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  prompt text NOT NULL,
  style text,
  image_url text NOT NULL,
  created_at timestamp DEFAULT now()
);

ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Allow service role full access:
CREATE POLICY "Service role full access"
  ON generations
  USING (true)
  WITH CHECK (true);
```
3. Create a storage bucket manually in your Supabase dashboard:
   - Name: `generated-images`
   - Set to **PUBLIC**
4. Copy your **Project URL** and **anon Key** to `client/.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Copy your **Project URL** and **service_role key** to `server/.env`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 3. Stability AI Setup
1. Go to [Stability AI](https://platform.stability.ai/) and get an API key.
2. Copy the API Key and place it in BOTH `server/.env` and `client/.env` as `STABILITY_API_KEY` (or `VITE_STABILITY_API_KEY` in the client).

## 4. Run the App

Open two terminal windows:

**Terminal 1 (Backend Server):**
```bash
cd server
npm install
node server.js
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm install
npm run dev
```

## 5. Experience PixelMind AI
Open `http://localhost:5173` in your browser. Clerk handles the login/signup automatically, so you can immediately sign in and start generating stunning AI art!
