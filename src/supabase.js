// ─── SUPABASE — GUEST DATA & WAIVERS ─────────────────────────────────────────
// Supabase handles persistent data: waivers, guest info, shop settings, events.
// PIPEDA compliant — Canadian data residency.
//
// Setup required (one-time):
// 1. Create project at supabase.com
// 2. Run the SQL schema from SPEC.md to create tables
// 3. Replace SUPABASE_URL and SUPABASE_ANON_KEY below
// 4. Enable Row Level Security on guests table
// 5. Create policy: anon can INSERT only (not read — privacy)

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Gracefully handle missing config (dev mode without Supabase)
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

const noSupabase = () => {
  console.warn("Supabase not configured — waiver data not saved");
  return { data: null, error: { message: "Supabase not configured" } };
};

// ── WAIVER SAVE ───────────────────────────────────────────────────────────────

export async function saveWaiver(waiverData) {
  if (!supabase) return noSupabase();
  return supabase.from("guests").insert([{
    location:            waiverData.shopId,
    event_code:          waiverData.eventCode  || null,
    event_name:          waiverData.eventName  || null,
    full_name:           waiverData.name,
    date_of_birth:       waiverData.dob,
    email:               waiverData.email      || null,
    phone:               waiverData.phone      || null,
    postal_code:         waiverData.postalCode || null,
    email_consent:       waiverData.emailConsent  || false,
    sms_consent:         waiverData.smsConsent    || false,
    photo_consent:       waiverData.photoConsent  || false,
    waiver_signed:       true,
    signature_url:       waiverData.signatureUrl,
    ip_address:          waiverData.ip          || null,
    user_agent:          navigator.userAgent,
    waiver_version:      "v2-2026",
    is_minor:            waiverData.isMinor     || false,
    guardian_name:       waiverData.guardianName          || null,
    guardian_relationship: waiverData.guardianRelationship || null,
    guardian_phone:      waiverData.guardianPhone          || null,
    guardian_email:      waiverData.guardianEmail          || null,
    guardian_signature_url: waiverData.guardianSignatureUrl || null,
  }]);
}

// ── SHOP SETTINGS ─────────────────────────────────────────────────────────────

export async function loadShopSettings(shopId) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("shop_settings")
    .select("*")
    .eq("shop_id", shopId)
    .single();
  return data;
}

export async function saveShopSettings(shopId, settings) {
  if (!supabase) return noSupabase();
  return supabase.from("shop_settings").upsert({
    shop_id:     shopId,
    ...settings,
    updated_at:  new Date().toISOString(),
  });
}

// ── EVENTS ────────────────────────────────────────────────────────────────────

export async function loadTodayEvents(shopId) {
  if (!supabase) return [];
  const now = new Date().toISOString();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("shop_id", shopId)
    .eq("archived", false)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("start_time", { ascending: true });

  return data || [];
}

export async function createEvent(shopId, event) {
  if (!supabase) return noSupabase();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  return supabase.from("events").insert([{
    shop_id:    shopId,
    name:       event.name,
    start_time: event.startTime || null,
    room_code:  event.roomCode,
    is_league:  event.isLeague  || false,
    expires_at: event.isLeague  ? null : midnight.toISOString(),
  }]);
}

export async function archiveEvent(eventId) {
  if (!supabase) return noSupabase();
  return supabase.from("events").update({ archived: true }).eq("id", eventId);
}

// ── GUEST LOOKUP (for photo sharing) ─────────────────────────────────────────
// Only used by manager/coach — fetches contacts for guests in this event

export async function getEventGuests(eventCode) {
  if (!supabase) return [];
  const { data } = await supabase
    .from("guests")
    .select("full_name, email, phone, email_consent, sms_consent, photo_consent")
    .eq("event_code", eventCode)
    .order("created_at", { ascending: true });
  return data || [];
}
