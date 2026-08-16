// ─── SHOP PAGE — EVENT LIST ───────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { C, MASTER_PIN, canManage, getRoomType } from "./constants";
import { loadTodayEvents, loadShopSettings, createEvent, archiveEvent } from "./supabase";
import { nextWalkInCode } from "./firebase";

export default function ShopPage({ shop, onJoinEvent, onBack }) {
  const [events, setEvents]         = useState([]);
  const [settings, setSettings]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [entering, setEntering]     = useState(null);
  const [managerPin, setManagerPin] = useState("");
  const [showManager, setShowManager] = useState(false);
  const [managerAuthed, setManagerAuthed] = useState(false);
  const [pinError, setPinError]     = useState("");

  // New event form
  const [newEventName, setNewEventName]   = useState("");
  const [newEventTime, setNewEventTime]   = useState("");
  const [newEventIsLeague, setNewEventIsLeague] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [msg, setMsg]                     = useState("");

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const loadData = async () => {
    setLoading(true);
    const [evts, sett] = await Promise.all([
      loadTodayEvents(shop.id),
      loadShopSettings(shop.id),
    ]);
    setEvents(evts || []);
    setSettings(sett || {});
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [shop.id]);

  const handleJoin = (roomCode, eventName) => {
    setEntering(roomCode);
    setTimeout(() => onJoinEvent(roomCode, eventName, shop), 350);
  };

  const handleWalkIn = async () => {
    const code = await nextWalkInCode(shop.id, shop.walkInPrefix);
    // Save walk-in as a today-only event so others can rejoin
    await createEvent(shop.id, {
      name: `Walk-in #${code.replace(shop.walkInPrefix, "")}`,
      roomCode: code,
      startTime: new Date().toISOString(),
      isLeague: false,
    });
    loadData();
    handleJoin(code, `Walk-in ${code}`);
  };

  const handleManagerAuth = () => {
    const correctPin = settings?.manager_pin || shop.defaultManagerPin;
    if (managerPin === MASTER_PIN || managerPin === correctPin) {
      setManagerAuthed(true);
      setPinError("");
      setManagerPin("");
    } else {
      setPinError("Wrong PIN");
    }
  };

  const handleAddEvent = async () => {
    if (!newEventName.trim()) { notify("Enter an event name"); return; }
    setSaving(true);
    const prefix = newEventIsLeague ? `${shop.walkInPrefix}LG` : `${shop.walkInPrefix}EVT_`;
    const suffix = newEventIsLeague
      ? String(events.filter(e => e.is_league).length + 1)
      : Date.now().toString().slice(-6);
    const roomCode = `${prefix}${suffix}`;
    await createEvent(shop.id, {
      name:      newEventName.trim(),
      startTime: newEventTime ? new Date(`${new Date().toDateString()} ${newEventTime}`).toISOString() : null,
      roomCode,
      isLeague:  newEventIsLeague,
    });
    setNewEventName(""); setNewEventTime(""); setSaving(false);
    notify("✅ Event added!");
    loadData();
  };

  // Separate and sort events
  const bookedEvents = events.filter(e => !e.is_league && !e.name.startsWith("Walk-in"));
  const walkInEvents = events.filter(e => e.name.startsWith("Walk-in"));
  const leagueEvents = events.filter(e => e.is_league);

  const EventTile = ({ ev, color, bg, icon }) => {
    const isEntering = entering === ev.room_code;
    return (
      <div onClick={() => handleJoin(ev.room_code, ev.name)} style={{
        background: isEntering ? color : bg,
        border: `2px solid ${color}`,
        borderRadius: 14, padding: "16px 20px", marginBottom: 10,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
        transform: isEntering ? "scale(0.97)" : "scale(1)",
        boxShadow: isEntering ? `0 0 20px ${color}44` : "none",
        transition: "all 0.2s",
      }}>
        <span style={{ fontSize: 28, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: isEntering ? "#fff" : color,
            fontFamily: "monospace", fontWeight: "bold", fontSize: 15 }}>
            {ev.name}
          </div>
          {ev.start_time && (
            <div style={{ color: C.ghost, fontFamily: "monospace", fontSize: 11, marginTop: 2 }}>
              {new Date(ev.start_time).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
        <div style={{ color, fontSize: 20 }}>{isEntering ? "⏳" : "›"}</div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: C.obsidian, color: C.bone,
      padding: "24px 20px 60px", maxWidth: 480, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none",
          color: C.ghost, fontFamily: "monospace", fontSize: 13, cursor: "pointer",
          marginBottom: 16, padding: 0 }}>
          ← All Locations
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: `${shop.color}22`, border: `1px solid ${shop.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
            🪓
          </div>
          <div>
            <h1 style={{ color: shop.accent, fontFamily: "Georgia, serif",
              fontSize: 22, margin: 0 }}>{shop.name}</h1>
            <div style={{ color: C.ghost, fontFamily: "monospace", fontSize: 12 }}>
              📍 {shop.city}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: C.ghost, fontFamily: "monospace",
          padding: 40, fontSize: 13 }}>Loading today's events...</div>
      )}

      {!loading && (<>

        {/* Booked Events */}
        {bookedEvents.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: C.gold, fontFamily: "monospace", fontSize: 11,
              fontWeight: "bold", letterSpacing: 2, marginBottom: 10 }}>
              📅 TODAY'S EVENTS
            </div>
            {bookedEvents.map(ev => (
              <EventTile key={ev.id} ev={ev} color={C.gold} bg="#0d0a00" icon="📅" />
            ))}
          </div>
        )}

        {/* League Events */}
        {leagueEvents.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: C.steel, fontFamily: "monospace", fontSize: 11,
              fontWeight: "bold", letterSpacing: 2, marginBottom: 10 }}>
              🏅 LEAGUE EVENTS
            </div>
            {leagueEvents.map(ev => (
              <EventTile key={ev.id} ev={ev} color={C.steel} bg="#050a12" icon="🏅" />
            ))}
          </div>
        )}

        {/* Walk-in Sessions (rejoin) */}
        {walkInEvents.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: C.lime, fontFamily: "monospace", fontSize: 11,
              fontWeight: "bold", letterSpacing: 2, marginBottom: 10 }}>
              🚶 ACTIVE WALK-IN SESSIONS
            </div>
            {walkInEvents.map(ev => (
              <EventTile key={ev.id} ev={ev} color={C.lime} bg="#0a1a0a" icon="🚶" />
            ))}
          </div>
        )}

        {/* New Walk-in */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: C.lime, fontFamily: "monospace", fontSize: 11,
            fontWeight: "bold", letterSpacing: 2, marginBottom: 10 }}>
            🚶 START A WALK-IN
          </div>
          <div onClick={handleWalkIn} style={{
            background: "#0a1a0a", border: `2px solid ${C.lime}`,
            borderRadius: 14, padding: "18px 20px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <span style={{ fontSize: 32 }}>🚶</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.lime, fontFamily: "monospace",
                fontWeight: "bold", fontSize: 15 }}>New Walk-in Session</div>
              <div style={{ color: "#446644", fontFamily: "monospace",
                fontSize: 11, marginTop: 3 }}>
                Creates a fresh room for your group
              </div>
            </div>
            <div style={{ color: C.lime, fontSize: 20 }}>›</div>
          </div>
        </div>

        {/* Manager Panel */}
        {!showManager && (
          <button onClick={() => setShowManager(true)} style={{
            background: "transparent", border: `1px solid ${C.ash}`,
            borderRadius: 10, padding: "10px 16px", color: C.ghost,
            fontFamily: "monospace", fontSize: 12, cursor: "pointer",
            width: "100%", marginTop: 8 }}>
            🔑 Manager Login
          </button>
        )}

        {showManager && !managerAuthed && (
          <div style={{ background: C.coal, border: `1px solid ${C.gold}`,
            borderRadius: 12, padding: 18, marginTop: 10 }}>
            <div style={{ color: C.gold, fontFamily: "monospace", fontWeight: "bold",
              fontSize: 12, marginBottom: 12 }}>🔑 MANAGER LOGIN</div>
            <input type="password" value={managerPin} autoFocus
              onChange={e => { setManagerPin(e.target.value); setPinError(""); }}
              onKeyDown={e => e.key === "Enter" && handleManagerAuth()}
              placeholder="Manager PIN"
              style={{ width: "100%", background: "#1a1a1a", border: `2px solid ${pinError ? "#e63946" : C.ash}`,
                borderRadius: 8, padding: "12px", color: "#fff", fontFamily: "monospace",
                fontSize: 18, letterSpacing: 4, textAlign: "center", outline: "none",
                boxSizing: "border-box", marginBottom: 8 }} />
            {pinError && <div style={{ color: "#e63946", fontFamily: "monospace",
              fontSize: 12, textAlign: "center", marginBottom: 8 }}>{pinError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowManager(false); setManagerPin(""); setPinError(""); }}
                style={{ flex: 1, background: "#222", color: C.ghost, border: `1px solid ${C.ash}`,
                  borderRadius: 8, padding: "12px", fontFamily: "monospace", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleManagerAuth}
                style={{ flex: 2, background: C.gold, color: "#000", border: "none",
                  borderRadius: 8, padding: "12px", fontFamily: "monospace",
                  fontWeight: "bold", fontSize: 14, cursor: "pointer" }}>
                🔓 Login
              </button>
            </div>
          </div>
        )}

        {showManager && managerAuthed && (
          <div style={{ background: C.coal, border: `1px solid ${C.gold}33`,
            borderRadius: 12, padding: 18, marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 14 }}>
              <div style={{ color: C.gold, fontFamily: "monospace",
                fontWeight: "bold", fontSize: 12 }}>⚙️ MANAGER PANEL</div>
              <button onClick={() => { setManagerAuthed(false); setShowManager(false); }}
                style={{ background: "transparent", border: "none",
                  color: C.ghost, cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            {msg && (
              <div style={{ background: "#1a2a1a", border: "1px solid #4f4",
                borderRadius: 8, padding: "8px 12px", marginBottom: 12,
                color: "#4f4", fontFamily: "monospace", fontSize: 13 }}>{msg}</div>
            )}

            <div style={{ color: C.ghost, fontFamily: "monospace", fontSize: 11,
              marginBottom: 10 }}>Add a new event to today's list:</div>

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input type="time" value={newEventTime}
                onChange={e => setNewEventTime(e.target.value)}
                style={{ background: "#1a1a1a", border: `1px solid ${C.ash}`,
                  borderRadius: 8, padding: "10px 8px", color: "#fff",
                  fontFamily: "monospace", fontSize: 13, width: 110, flexShrink: 0 }} />
              <input type="text" value={newEventName} placeholder="Event name..."
                onChange={e => setNewEventName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddEvent()}
                style={{ flex: 1, background: "#1a1a1a", border: `1px solid ${C.ash}`,
                  borderRadius: 8, padding: "10px 12px", color: "#fff",
                  fontFamily: "monospace", fontSize: 13, outline: "none" }} />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12,
              alignItems: "center" }}>
              <button onClick={() => setNewEventIsLeague(l => !l)} style={{
                background: newEventIsLeague ? "#0a1020" : "#1a1a1a",
                border: `1px solid ${newEventIsLeague ? C.steel : C.ash}`,
                borderRadius: 8, padding: "8px 14px", color: newEventIsLeague ? C.steel : C.ghost,
                fontFamily: "monospace", fontSize: 12, cursor: "pointer" }}>
                {newEventIsLeague ? "🏅 League Event" : "📅 Regular Event"}
              </button>
              <button onClick={handleAddEvent} disabled={saving || !newEventName.trim()} style={{
                flex: 1, background: newEventName.trim() ? C.gold : "#222",
                color: newEventName.trim() ? "#000" : C.ghost, border: "none",
                borderRadius: 8, padding: "10px", fontFamily: "monospace",
                fontWeight: "bold", fontSize: 14, cursor: newEventName.trim() ? "pointer" : "not-allowed" }}>
                {saving ? "..." : "+ Add Event"}
              </button>
            </div>

            {/* Existing events with archive option */}
            {events.length > 0 && (
              <div>
                <div style={{ color: C.ghost, fontFamily: "monospace",
                  fontSize: 11, marginBottom: 8 }}>Today's events:</div>
                {events.map(ev => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center",
                    gap: 8, marginBottom: 6, background: "#0d0d0d",
                    borderRadius: 8, padding: "8px 12px" }}>
                    <span style={{ color: ev.is_league ? C.steel : C.gold,
                      fontFamily: "monospace", fontSize: 13, flex: 1 }}>
                      {ev.name}
                    </span>
                    <button onClick={() => archiveEvent(ev.id).then(loadData)} style={{
                      background: "transparent", border: "none",
                      color: C.ghost, cursor: "pointer", fontSize: 12,
                      fontFamily: "monospace" }}>Archive</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>)}
    </div>
  );
                         }
