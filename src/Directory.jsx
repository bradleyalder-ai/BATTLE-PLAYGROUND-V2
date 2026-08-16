// ─── DIRECTORY — QR LANDING & SHOP SELECT ────────────────────────────────────
import { useState } from "react";
import { SHOPS, C } from "./constants";

export default function Directory({ onSelectShop }) {
  const [entering, setEntering] = useState(null);

  const handleTap = (shop) => {
    setEntering(shop.id);
    setTimeout(() => { onSelectShop(shop); setEntering(null); }, 350);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.obsidian, color: C.bone,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 20px 60px" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        {/* Axe icon — the brand signature */}
        <div style={{ fontSize: 72, marginBottom: 12, filter: "drop-shadow(0 0 20px #f0c04066)" }}>
          🪓
        </div>
        <h1 style={{ color: C.gold, fontFamily: "Georgia, serif", fontSize: 28,
          margin: "0 0 6px", letterSpacing: 4, textTransform: "uppercase",
          textShadow: `0 0 30px ${C.gold}44` }}>
          Battle Playground
        </h1>
        <div style={{ color: C.ghost, fontFamily: "monospace", fontSize: 12,
          letterSpacing: 3, textTransform: "uppercase" }}>
          Experience
        </div>
      </div>

      {/* Shop tiles */}
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ color: C.ghost, fontFamily: "monospace", fontSize: 11,
          letterSpacing: 2, marginBottom: 16, textAlign: "center",
          textTransform: "uppercase" }}>
          Select your location
        </div>

        {SHOPS.map(shop => {
          const isEntering = entering === shop.id;
          return (
            <div key={shop.id} onClick={() => handleTap(shop)} style={{
              background: isEntering ? shop.color : shop.bg,
              border: `2px solid ${isEntering ? shop.accent : shop.color}`,
              borderRadius: 18, padding: "24px 20px", marginBottom: 16,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 18,
              transform: isEntering ? "scale(0.97)" : "scale(1)",
              boxShadow: isEntering ? `0 0 32px ${shop.color}55` : `0 4px 24px #00000066`,
              transition: "all 0.2s",
            }}>
              {/* Icon box */}
              <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 14,
                background: `${shop.color}22`, border: `1px solid ${shop.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32 }}>
                🪓
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ color: isEntering ? "#fff" : shop.accent,
                  fontFamily: "Georgia, serif", fontSize: 20,
                  fontWeight: "bold", marginBottom: 4 }}>
                  {shop.shortName}
                </div>
                <div style={{ color: isEntering ? "#ffffff99" : C.ghost,
                  fontFamily: "monospace", fontSize: 12 }}>
                  📍 {shop.city}
                </div>
                <div style={{ color: isEntering ? "#ffffff88" : C.ghost,
                  fontFamily: "monospace", fontSize: 11, marginTop: 2 }}>
                  {shop.address}
                </div>
              </div>

              <div style={{ color: isEntering ? "#fff" : shop.color, fontSize: 24 }}>
                {isEntering ? "⏳" : "›"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 40, color: "#2a2a2a", fontFamily: "monospace",
        fontSize: 10, letterSpacing: 1, textAlign: "center" }}>
        BATTLE PLAYGROUND EXPERIENCE © 2026
      </div>
    </div>
  );
                             }
