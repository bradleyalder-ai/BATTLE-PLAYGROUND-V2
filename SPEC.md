# Battle Playground Experience — v2 Platform Spec
*Written before first line of code. Every decision justified.*

---

## What This Is

A **venue management platform** for Battle Playground Experience (Axe Throwing Winnipeg + Calgary).
Not just a scoring app — a complete guest journey from QR code scan to post-visit marketing.

---

## Business Goals (ranked by value)

1. Capture valid digital waivers for insurance compliance
2. Collect guest data (name, email, phone) for marketing
3. Increase event engagement via live games and tournaments
4. Drive return visits via photo sharing and automated promos
5. Reduce staff admin burden (no paper waivers, auto-populated names)

---

## Tech Stack — Every Choice Justified

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | React + Vite | Same as v1 — team knows it, fast builds |
| Hosting | Vercel | Same — auto-deploys from GitHub, free tier |
| Live game data | Firebase Realtime DB | Same — real-time sync is perfect for scoring |
| Waiver + guest DB | Supabase | PostgreSQL, queryable, Canadian data residency, free tier |
| Signatures | react-signature-canvas | Client-side canvas, saves as base64 PNG |
| Photos | Cloudinary | Free tier, image transforms for branded frames |
| SMS | Twilio | Industry standard, cheap per-message |
| Email | Resend | Modern, reliable, free tier |
| Calendar sync | Google Calendar API | Public read — no auth needed for read-only events |

---

## File Structure (strictly enforced — max 300 lines per file)

```
src/
  main.jsx              — root router (scan → shop → event → waiver → game)
  firebase.js           — Firebase init + game data helpers
  supabase.js           — Supabase init + waiver save helpers

  // GUEST FLOW
  Directory.jsx         — QR landing + shop select (Wpg / Cgy)
  ShopPage.jsx          — Event list for selected shop
  WaiverForm.jsx        — Full digital waiver with signature pad
  WaiverMinor.jsx       — Guardian section (shown if age < 18)
  GameRoom.jsx          — Hub after waiver — routes to all game modes

  // GAMES (ported + cleaned from v1)
  MatchScreen.jsx       — 1v1 axe target scoring (isolated, < 300 lines)
  TournamentScreen.jsx  — Bracket management (isolated, < 300 lines)
  LeagueScreen.jsx      — League schedule + standings (isolated, < 300 lines)
  Game21.jsx            — Mini game (port from v1)
  AroundTheWorld.jsx    — Mini game (port from v1)
  ZombieHunter.jsx      — Mini game (port from v1)
  Leaderboard.jsx       — Per-shop top 100 (port from v1)

  // STAFF TOOLS
  ManagerPanel.jsx      — Event creation, settings, photo tool
  PhotoCapture.jsx      — Camera + branded frame + share

  // SHARED
  PinModal.jsx          — Role unlock (guest/scorer/manager/master)
  AxeTarget.jsx         — SVG target (isolated, reused by MatchScreen)
  useRoomType.js        — Hook: detects league vs event vs walk-in from room code
  constants.js          — SHOPS array, MASTER_PIN, colors, role hierarchy
```

---

## Permission System (same as v1, defined upfront)

```js
// constants.js
export const MASTER_PIN = "GOLDEN88"; // works everywhere
export const ROLES = { guest:0, scorer:1, manager:2, master:3 };
export const canScore  = r => ROLES[r] >= ROLES.scorer;
export const canManage = r => ROLES[r] >= ROLES.manager;
export const isMaster  = r => r === "master";
```

PINs stored in Supabase `shop_settings` table (not Firebase — persistent,
not real-time, perfect for settings). Loaded once on app mount.

---

## Room Code System (simplified from v1)

```
GA_WPG_SETTINGS  — shop settings room (never a game room)
WPG001, WPG002   — walk-in rooms (sequential)
WPGEVT_[id]      — booked event rooms (from calendar)
WPGLG1, WPGLG2   — league rooms (persistent)
```

Detection:
```js
const isLeague  = code.match(/^(WPG|YYC)LG\d+$/);
const isWalkIn  = code.match(/^(WPG|YYC)\d{3,}$/);
const isEvent   = code.match(/^(WPG|YYC)EVT_/);
```

---

## Supabase Schema (waiver database)

```sql
-- Guests table
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  location TEXT NOT NULL,           -- 'WPG' or 'YYC'
  event_code TEXT,                  -- room code they joined
  event_name TEXT,                  -- event they attended

  -- Personal info
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  email TEXT,
  phone TEXT,
  postal_code TEXT,

  -- Consent flags
  email_consent BOOLEAN DEFAULT false,
  sms_consent BOOLEAN DEFAULT false,
  photo_consent BOOLEAN DEFAULT false,

  -- Waiver
  waiver_signed BOOLEAN DEFAULT true,
  signature_url TEXT NOT NULL,      -- Cloudinary URL of signature image
  ip_address TEXT,
  user_agent TEXT,
  waiver_version TEXT DEFAULT 'v2-2026',

  -- Minor fields (null if adult)
  is_minor BOOLEAN DEFAULT false,
  guardian_name TEXT,
  guardian_relationship TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  guardian_signature_url TEXT
);

-- Shop settings table
CREATE TABLE shop_settings (
  shop_id TEXT PRIMARY KEY,         -- 'WPG' or 'YYC'
  shop_name TEXT,
  logo_url TEXT,
  manager_pin TEXT,
  scorer_pin TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Events table (manager-created, shown on shop page)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_time TIMESTAMPTZ,
  room_code TEXT NOT NULL,
  is_league BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ             -- null = never (league), set = auto-hide
);
```

---

## Guest Flow (Phase 1 — build first)

```
1. Guest scans QR code → opens app URL
2. Directory → taps shop (Wpg or Cgy)
3. ShopPage → sees today's events + Walk-in button
4. Taps event or Walk-in → WaiverForm opens
5. Fills: name, DOB, email, phone, postal (optional)
   → If DOB shows age < 18 → WaiverMinor section appears
   → Reads waiver text (scrollable)
   → Checks consent boxes (optional)
   → Signs with finger on canvas
   → Taps "I Agree & Sign In"
6. Waiver saved to Supabase (name, email, phone, sig, consents, IP, timestamp)
7. GameRoom opens — their name auto-populated in the player list
8. All guests who signed into the same event see each other's names
```

---

## Game Room (Phase 2 — port from v1 cleaned up)

Identical features to v1 but with clean file separation:
- Hub shows correct tiles based on room type (league vs event vs walk-in)
- Players come from waiver signup (no manual entry needed for events)
- Scorer/manager can still add/remove players manually
- All mini games, 1v1 matches, tournament, leaderboard

---

## Photo Sharing (Phase 3)

```
Coach taps 📸 in game room
→ Device camera opens (via browser API)
→ Photo taken → branded frame overlaid (Cloudinary transform)
→ Preview shown with 3 frame options (axes / bullseye / golden axe logo)
→ Coach taps Share
→ App queries Supabase for all guests in this event who gave phone/email
→ Sends via Twilio (SMS) or Resend (email) based on what each guest provided
→ Message: "Your Battle Playground photo! [link] Book again: [link]"
```

---

## Marketing Automation (Phase 4)

Triggered from Supabase Edge Functions:
- **2 hours after waiver** → Google Review request SMS/email (to all who consented)
- **7 days after visit** → Return promo SMS/email ("10% off your next booking")
- **14 days before birthday** → Birthday promo (if DOB collected)
- **After tournament win** → Leaderboard screenshot + share prompt

---

## Design System

```
Brand: Battle Playground Experience
Tone: Bold, dark, industrial — axes and combat sports energy

Colors:
  OBSIDIAN  #0a0a0a   — background
  COAL      #111111   — card background
  GOLD      #f0c040   — primary accent (axe throwing)
  BLOOD     #c1121f   — danger / Winnipeg
  STEEL     #1d6a96   — league / Calgary
  LIME      #39ff14   — walk-in / success
  ASH       #333333   — borders
  BONE      #cccccc   — body text
  GHOST     #666666   — secondary text

Typography:
  Display:  Georgia serif — headings, shop names, scores
  Body:     'monospace'   — codes, labels, stats (feels like a scoreboard)
  UI:       system-ui     — buttons, inputs (fast rendering on mobile)

Signature element: The axe target SVG appears as a watermark/motif
  throughout — in loading states, empty states, background texture.
  Makes every screen feel like it belongs to the same world.

Mobile-first: 390px base, tablet at 600px, no desktop-specific layouts needed.
```

---

## What We Learned From v1 (enforced in v2)

1. **Max 300 lines per file** — hard limit, split before hitting it
2. **All hooks at top of every component** — no exceptions
3. **Names as IDs in league** — player ID is their name string, no lookup tables
4. **Firebase hasLoadedRef guard** — always, prevents data wipe on new device join
5. **pointerEvents="none" on all SVG text** — always
6. **Room type from code pattern** — regex, not array lookup
7. **PINs from Supabase not Firebase** — persistent settings need persistent DB
8. **dayView in parent not child** — any state that survives screen nav goes in parent
9. **Deep clone in double elim** — JSON.parse(JSON.stringify()) not spread
10. **Hardware back button intercepted** — history.pushState on every screen change
