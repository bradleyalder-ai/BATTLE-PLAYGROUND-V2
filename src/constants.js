// ─── BATTLE PLAYGROUND EXPERIENCE — CONSTANTS ────────────────────────────────
// Single source of truth. Import from here, never hardcode elsewhere.

// ── MASTER ACCESS ────────────────────────────────────────────────────────────
export const MASTER_PIN = "GOLDEN88";

// ── SHOPS ────────────────────────────────────────────────────────────────────
export const SHOPS = [
  {
    id:               "WPG",
    settingsCode:     "GA_WPG_SETTINGS",
    walkInPrefix:     "WPG",
    name:             "Axe Throwing Winnipeg",
    shortName:        "Winnipeg",
    city:             "Winnipeg, MB",
    address:          "30 Durand, Unit #4, Winnipeg, MB",
    color:            "#c1121f",
    accent:           "#ff5555",
    bg:               "#1a0000",
    defaultManagerPin:"AXEWPG1",
    defaultScorerPin: "THROW1",
  },
  {
    id:               "YYC",
    settingsCode:     "GA_YYC_SETTINGS",
    walkInPrefix:     "YYC",
    name:             "Axe Throwing Calgary",
    shortName:        "Calgary",
    city:             "Calgary, AB",
    address:          "Calgary, AB",
    color:            "#1d6a96",
    accent:           "#4a90d9",
    bg:               "#00101a",
    defaultManagerPin:"AXEYYC1",
    defaultScorerPin: "THROW2",
  },
];

// ── ROOM CODE HELPERS ────────────────────────────────────────────────────────
export const getShopFromCode = (code) => {
  if (!code) return null;
  return SHOPS.find(s =>
    code === s.settingsCode ||
    code.startsWith(s.walkInPrefix)
  ) || null;
};

export const getRoomType = (code) => {
  if (!code) return "unknown";
  if (/^(WPG|YYC)LG\d+$/i.test(code))   return "league";
  if (/^(WPG|YYC)\d{3,}$/i.test(code))   return "walkin";
  if (/^(WPG|YYC)EVT_/i.test(code))      return "event";
  return "unknown";
};

// ── ROLES & PERMISSIONS ───────────────────────────────────────────────────────
export const ROLES = { guest: 0, scorer: 1, manager: 2, master: 3 };
export const ROLE_LABELS = {
  guest:   { label: "👁️ Guest",   color: "#888888" },
  scorer:  { label: "🪓 Scorer",  color: "#4a90d9" },
  manager: { label: "⚙️ Manager", color: "#f0c040" },
  master:  { label: "🔴 Master",  color: "#e63946" },
};
export const canScore  = (role) => (ROLES[role] ?? 0) >= ROLES.scorer;
export const canManage = (role) => (ROLES[role] ?? 0) >= ROLES.manager;
export const isMaster  = (role) => role === "master";

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
export const C = {
  obsidian: "#0a0a0a",
  coal:     "#111111",
  gold:     "#f0c040",
  blood:    "#c1121f",
  steel:    "#1d6a96",
  lime:     "#39ff14",
  ash:      "#333333",
  bone:     "#cccccc",
  ghost:    "#666666",
};

// ── ACTIVITIES (for waiver) ───────────────────────────────────────────────────
export const ACTIVITIES = [
  "Axe Throwing",
  "Smash / Rage Room",
  "Tag Archery",
  "Excalibur Experience / Log Splitting",
  "Foam Sword and Shield Fighting",
];

// ── WAIVER VERSION ────────────────────────────────────────────────────────────
export const WAIVER_VERSION = "v2-2026";

// ── GAME SETTINGS DEFAULTS ────────────────────────────────────────────────────
export const DEFAULT_MATCH_SETTINGS = {
  throwsPerPlayer: 5,
  roundsPerMatch:  3,
};

export const DEFAULT_LEAGUE_SETTINGS = {
  throwsPerPlayer:  5,
  roundsPerMatch:   3,
  matchesPerPlayer: 3,
  days:             7,
};
