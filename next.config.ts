import type { NextConfig } from "next";

// A integração Supabase ↔ Vercel cria SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY.
// Aqui garantimos que as variáveis NEXT_PUBLIC_* (usadas no código) existam mesmo quando só
// as versões sem prefixo foram definidas. Os valores são embutidos no build.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY;

const nextConfig: NextConfig = {
  // Renderização dinâmica clássica (sessão via cookies em toda página da área logada).
  // cacheComponents fica desligado de propósito: simplifica auth + RLS.
  env: {
    ...(supabaseUrl ? { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } : {}),
    ...(supabaseAnonKey ? { NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey } : {}),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
