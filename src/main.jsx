// ─── MAIN — ROOT ROUTER ───────────────────────────────────────────────────────
// Guest journey: Directory → ShopPage → WaiverForm → GameRoom
// State flows down through props — no context needed at this stage
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import Directory  from "./Directory";
import ShopPage   from "./ShopPage";
import WaiverForm from "./WaiverForm";
// GameRoom imported lazily — only needed after waiver
const GameRoom = React.lazy(() => import("./GameRoom"));

function Root() {
  const [screen, setScreen] = useState("directory");
  const [shop,   setShop]   = useState(null);
  const [event,  setEvent]  = useState(null); // { roomCode, eventName }
  const [guest,  setGuest]  = useState(null); // { name, email, phone, photoConsent }

  // Hardware back button intercept (Android)
  useEffect(() => {
    window.history.pushState({ screen }, "", window.location.href);
    const handlePop = () => {
      window.history.pushState({ screen }, "", window.location.href);
      if (screen === "game")   { setScreen("directory"); setGuest(null); return; }
      if (screen === "waiver") { setScreen("shop"); return; }
      if (screen === "shop")   { setScreen("directory"); setShop(null); return; }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [screen]);

  if (screen === "directory") {
    return (
      <Directory onSelectShop={s => {
        setShop(s);
        setScreen("shop");
      }} />
    );
  }

  if (screen === "shop") {
    return (
      <ShopPage
        shop={shop}
        onJoinEvent={(roomCode, eventName, selectedShop) => {
          setEvent({ roomCode, eventName });
          if (selectedShop) setShop(selectedShop);
          setScreen("waiver");
        }}
        onBack={() => { setScreen("directory"); setShop(null); }}
      />
    );
  }

  if (screen === "waiver") {
    return (
      <WaiverForm
        shop={shop}
        eventCode={event?.roomCode}
        eventName={event?.eventName}
        onComplete={guestData => {
          setGuest(guestData);
          setScreen("game");
        }}
        onBack={() => setScreen("shop")}
      />
    );
  }

  if (screen === "game") {
    return (
      <React.Suspense fallback={
        <div style={{ minHeight: "100vh", background: "#0a0a0a",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#f0c040", fontFamily: "monospace", fontSize: 16 }}>
          🪓 Loading...
        </div>
      }>
        <GameRoom
          shop={shop}
          event={event}
          guest={guest}
          onLeave={() => {
            setScreen("directory");
            setShop(null);
            setEvent(null);
            setGuest(null);
          }}
        />
      </React.Suspense>
    );
  }

  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
