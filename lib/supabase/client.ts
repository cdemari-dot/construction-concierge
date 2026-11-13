"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

// For Client Components (the kiosk and field mobile app live almost
// entirely on the client, since they need the camera and geolocation).
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
