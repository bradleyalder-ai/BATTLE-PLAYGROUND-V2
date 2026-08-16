// ─── FIREBASE — GAME DATA ─────────────────────────────────────────────────────
// Firebase handles LIVE data only: game state, scores, tournament brackets.
// Guest data and waivers go to Supabase (see supabase.js).

import { initializeApp } from "firebase/app";
import {
  getDatabase, ref, set, get, onValue, off, update, remove,
} from "firebase/database";

const app = initializeApp({
  apiKey:      "AIzaSyBraiLVl5ZOIvBAszhvtEBV8fSP9MHJyVI",
  databaseURL: "https://golden-axe-app-default-rtdb.firebaseio.com",
  projectId:   "golden-axe-app",
});

const db = getDatabase(app);
export { db, ref, set, get, onValue, off, update, remove };

// ── ROOM HELPERS ──────────────────────────────────────────────────────────────

// Subscribe to a room — returns unsubscribe fn
export function subscribeRoom(roomCode, callback) {
  const r = ref(db, `rooms/${roomCode}`);
  onValue(r, snap => callback(snap.val() || {}));
  return () => off(r);
}

// Write a single field (safe — won't overwrite unrelated fields)
export function writeField(roomCode, field, value) {
  return update(ref(db, `rooms/${roomCode}`), { [field]: value });
}

// Write multiple fields at once
export function writeFields(roomCode, fields) {
  return update(ref(db, `rooms/${roomCode}`), fields);
}

// ── MATCH AUTO-SAVE ───────────────────────────────────────────────────────────

export function saveMatchState(roomCode, matchId, state) {
  return set(ref(db, `activeMatch/${roomCode}`), {
    matchId, ...state, savedAt: Date.now(),
  }).catch(() => {});
}

export function loadMatchState(roomCode) {
  return get(ref(db, `activeMatch/${roomCode}`))
    .then(snap => snap.val())
    .catch(() => null);
}

export function clearMatchState(roomCode) {
  return remove(ref(db, `activeMatch/${roomCode}`)).catch(() => {});
}

// ── LEADERBOARD ───────────────────────────────────────────────────────────────
// Leaderboard key is shopId (WPG or YYC), not room code.

export async function submitLeaderboardEntry(shopId, category, name, score, context = "") {
  if (!shopId || !name || score === undefined) return;
  const lbPath = `leaderboards/${shopId}/${category}`;
  const snap = await get(ref(db, lbPath));
  const existing = snap.val() || {};
  const existingKey = Object.keys(existing).find(
    k => existing[k].name?.toLowerCase() === name.toLowerCase()
  );
  if (existingKey) {
    if (score <= existing[existingKey].score) return;
    await update(ref(db, `${lbPath}/${existingKey}`), { score, date: Date.now(), context });
  } else {
    const key = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await update(ref(db, `${lbPath}/${key}`), { name, score, date: Date.now(), context });
    const all = { ...existing, [key]: { name, score } };
    const sorted = Object.entries(all).sort((a, b) => b[1].score - a[1].score);
    for (const [k] of sorted.slice(100)) {
      await remove(ref(db, `${lbPath}/${k}`));
    }
  }
}

export function subscribeLeaderboard(shopId, callback) {
  const r = ref(db, `leaderboards/${shopId}`);
  onValue(r, snap => callback(snap.val() || {}));
  return () => off(r);
}

// ── WALK-IN COUNTER ───────────────────────────────────────────────────────────

export async function nextWalkInCode(shopId, prefix) {
  const counterRef = ref(db, `walkInCounter/${shopId}`);
  const snap = await get(counterRef);
  const next = (snap.val() || 0) + 1;
  await set(counterRef, next);
  return `${prefix}${String(next).padStart(3, "0")}`;
                                             }
