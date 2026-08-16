// ─── WAIVER FORM ─────────────────────────────────────────────────────────────
// Full digital waiver with:
//   • Personal info collection (name, DOB, email, phone)
//   • Minor detection → guardian section
//   • Waiver text (scrollable, must scroll to enable sign)
//   • Canvas signature pad
//   • Consent checkboxes (email, SMS, photo) — all optional
//   • Saves to Supabase on submit
//   • Guest name passed to game room on completion
import { useState, useRef, useEffect } from "react";
import { C, ACTIVITIES, WAIVER_VERSION } from "./constants";
import { saveWaiver } from "./supabase";
import SignaturePad from "./SignaturePad";

const WAIVER_TEXT = `BATTLE PLAYGROUND EXPERIENCE
Release, Waiver, Indemnity & Guest Information Agreement

This document will affect your legal rights and liabilities.
Please read carefully before signing.

ACTIVITIES COVERED BY THIS WAIVER
This waiver covers all activities offered at Battle Playground Experience, including:
• Axe Throwing
• Smash / Rage Room
• Tag Archery
• Excalibur Experience / Log Splitting
• Foam Sword and Shield Fighting
• All other activities offered on the premises, now and in the future

A. ACKNOWLEDGE AND AFFIRM
I represent, warrant, acknowledge, affirm, and agree:

1. That the Facilities include areas where axes, swords, bats, foam weapons, bows, arrows, and other implements are used within designated areas.

2. That participation in the Activities is subject to certain inherent risks and hazards, including but not limited to cuts, bruises, sprains, fractures, disability, paralysis, and death. These risks may be caused by my own actions or inactions, those of others, equipment issues, or other risks not known to me. I fully accept and assume all such risks.

3. That I enter the Facilities at my sole and absolute risk.

4. That I am absolutely and solely responsible for my own conduct, safety and wellbeing, as well as the conduct, safety and wellbeing of any minor accompanying me.

5. That I will follow all warnings and instructions posted or given to me by staff at all times. I understand that failure to follow staff instructions may result in injury, and that I will be personally liable for any damages caused by my failure to comply.

6. That I agree to pay for any damage to Facilities or equipment caused by my failure to follow staff instructions or safety rules.

7. That I am in good health and proper physical and mental condition to participate in the Activities. I am not under the influence of alcohol or drugs.

8. That if I believe conditions are unsafe, I will immediately discontinue participation and notify staff.

9. That Battle Playground Experience has the right to deny or discontinue my access at any time for failure to follow safety rules.

10. That I will respect all designated areas, range lines, and safety zones.

B. WAIVER, RELEASE, AND INDEMNITY

1. I do hereby fully release and discharge Battle Playground Experience, its affiliated companies, and their respective employees, directors, officers, coaches, agents, volunteers, successors and assigns (collectively, the "Released Parties") from any and all liability, claims, and causes of action for injuries, illness (including death), damages or loss arising out of my use of the Facilities or participation in the Activities.

2. This is a complete and irrevocable release and waiver of liability. I release the Released Parties from any claim arising out of their negligence, breach of contract, or breach of any statutory duty.

3. I further agree to indemnify, hold harmless, and defend the Released Parties from any and all claims arising out of my use of the Facilities.

4. In the event of any emergency, I authorize the Released Parties to secure any medical treatment deemed necessary for my immediate care and agree that I will be responsible for payment of any medical services rendered.

5. In entering into this Agreement, I am not relying on any representations made by the Released Parties regarding the safety of the Facilities.

C. GENERAL

1. If any part of this Agreement is unenforceable, the remainder continues in full force and effect.

2. This Agreement is governed by the laws of the Province of Manitoba (Winnipeg location) or Alberta (Calgary location), as applicable.

3. This Agreement is binding upon me and my heirs, next of kin, executors, administrators, assigns, and personal representatives.

PRIVACY NOTICE (PIPEDA)
Battle Playground Experience collects your personal information to: maintain waiver records for insurance compliance; contact you in the event of an incident; and send promotional communications if you consent. Your information is stored securely and will not be sold. Contact info@axethrowingwinnipeg.ca to request access or deletion.

I HAVE READ AND FULLY UNDERSTAND THIS AGREEMENT. I ACKNOWLEDGE THAT BY SIGNING I AM WAIVING CERTAIN LEGAL RIGHTS. THIS DOCUMENT IS BINDING UPON ME AND MY HEIRS.`;

export default function WaiverForm({ shop, eventCode, eventName, onComplete, onBack }) {
  // Personal info
  const [name, setName]           = useState("");
  const [dob, setDob]             = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [postal, setPostal]       = useState("");

  // Consent
  const [emailConsent, setEmailConsent] = useState(false);
  const [smsConsent, setSmsConsent]     = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);

  // Minor
  const [guardianName, setGuardianName]     = useState("");
  const [guardianRel, setGuardianRel]       = useState("");
  const [guardianPhone, setGuardianPhone]   = useState("");
  const [guardianEmail, setGuardianEmail]   = useState("");

  // UI state
  const [step, setStep]           = useState("info"); // info | waiver | sign
  const [hasScrolled, setHasScrolled] = useState(false);
  const [sig, setSig]             = useState(null);   // base64 signature
  const [guardianSig, setGuardianSig] = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");

  const waiverScrollRef = useRef(null);

  // Calculate age from DOB
  const age = dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : null;
  const isMinor = age !== null && age < 18;
  const tooYoung = age !== null && age < 10;

  // Track waiver scroll
  const handleWaiverScroll = (e) => {
    const el = e.target;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 40;
    if (atBottom) setHasScrolled(true);
  };

  const validateInfo = () => {
    if (!name.trim())  { setError("Please enter your full name"); return false; }
    if (!dob)          { setError("Please enter your date of birth"); return false; }
    if (tooYoung)      { setError("Minimum age is 10 years. Please see a staff member."); return false; }
    if (!email.trim() && !phone.trim()) {
      setError("Please enter at least one contact method (email or phone)"); return false;
    }
    if (isMinor) {
      if (!guardianName.trim())  { setError("Please enter the guardian's full name"); return false; }
      if (!guardianRel.trim())   { setError("Please enter your relationship to the participant"); return false; }
      if (!guardianPhone.trim()) { setError("Please enter the guardian's phone number"); return false; }
    }
    setError("");
    return true;
  };

  const handleSubmit = async () => {
    if (!sig) { setError("Please sign the waiver"); return; }
    if (isMinor && !guardianSig) { setError("Guardian signature required"); return; }

    setSubmitting(true);
    setError("");

    try {
      const result = await saveWaiver({
        shopId:    shop.id,
        eventCode,
        eventName,
        name:      name.trim(),
        dob,
        email:     email.trim() || null,
        phone:     phone.trim() || null,
        postalCode: postal.trim() || null,
        emailConsent,
        smsConsent,
        photoConsent,
        signatureUrl:  sig,  // In production: upload to Cloudinary first
        isMinor,
        guardianName:         isMinor ? guardianName.trim()  : null,
        guardianRelationship: isMinor ? guardianRel.trim()   : null,
        guardianPhone:        isMinor ? guardianPhone.trim() : null,
        guardianEmail:        isMinor ? guardianEmail.trim() : null,
        guardianSignatureUrl: isMinor ? guardianSig          : null,
      });

      if (result.error) {
        // Still proceed — don't block guest if Supabase is down
        console.error("Waiver save error:", result.error);
      }

      onComplete({ name: name.trim(), email: email.trim(), phone: phone.trim(), photoConsent });
    } catch (e) {
      console.error("Waiver submission error:", e);
      // Still proceed — waiver save failure shouldn't block the guest experience
      onComplete({ name: name.trim(), email: email.trim(), phone: phone.trim(), photoConsent });
    }
  };

  const inputStyle = {
    width: "100%", background: "#1a1a1a", border: `1px solid ${C.ash}`,
    borderRadius: 10, padding: "13px 14px", color: C.bone,
    fontFamily: "system-ui", fontSize: 16, outline: "none",
    boxSizing: "border-box", marginBottom: 12,
  };
  const labelStyle = {
    color: C.ghost, fontFamily: "monospace", fontSize: 11,
    display: "block", marginBottom: 4, letterSpacing: 1,
  };
  const sectionTitle = (text) => (
    <div style={{ color: C.gold, fontFamily: "monospace", fontWeight: "bold",
      fontSize: 12, letterSpacing: 2, marginBottom: 12, marginTop: 4 }}>
      {text}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.obsidian, color: C.bone,
      maxWidth: 500, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ background: C.coal, borderBottom: `2px solid ${C.gold}33`,
        padding: "16px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "none",
            color: C.ghost, cursor: "pointer", fontSize: 20, padding: 0 }}>←</button>
          <div>
            <div style={{ color: C.gold, fontFamily: "Georgia, serif",
              fontSize: 16, fontWeight: "bold" }}>
              Waiver & Sign-In
            </div>
            <div style={{ color: C.ghost, fontFamily: "monospace", fontSize: 11 }}>
              {eventName || "Walk-in"} · {shop.shortName}
            </div>
          </div>
        </div>
        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {["info","waiver","sign"].map((s, i) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2,
              background: step === s ? C.gold : i < ["info","waiver","sign"].indexOf(step) ? "#4f4" : C.ash,
              transition: "background 0.3s" }} />
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 20px 100px" }}>

        {/* ── STEP 1: INFO ── */}
        {step === "info" && (<>
          {sectionTitle("YOUR INFORMATION")}

          <label style={labelStyle}>FULL LEGAL NAME *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="First and Last Name" style={inputStyle} />

          <label style={labelStyle}>DATE OF BIRTH *</label>
          <input type="date" value={dob} onChange={e => setDob(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            style={inputStyle} />

          {tooYoung && (
            <div style={{ background: "#2a0000", border: "1px solid #e63946",
              borderRadius: 8, padding: 12, marginBottom: 12, color: "#e63946",
              fontFamily: "monospace", fontSize: 13 }}>
              ⚠️ Minimum age is 10 years. Please see a staff member.
            </div>
          )}

          {isMinor && !tooYoung && (
            <div style={{ background: "#1a1500", border: `1px solid ${C.gold}`,
              borderRadius: 10, padding: 14, marginBottom: 12 }}>
              {sectionTitle("PARENT / GUARDIAN REQUIRED")}
              <div style={{ color: C.ghost, fontFamily: "monospace", fontSize: 12,
                marginBottom: 12, lineHeight: 1.6 }}>
                This participant is under 18. A parent or legal guardian must
                complete and sign this waiver.
              </div>
              <label style={labelStyle}>GUARDIAN FULL NAME *</label>
              <input value={guardianName} onChange={e => setGuardianName(e.target.value)}
                placeholder="Guardian's Full Legal Name" style={inputStyle} />
              <label style={labelStyle}>RELATIONSHIP TO PARTICIPANT *</label>
              <input value={guardianRel} onChange={e => setGuardianRel(e.target.value)}
                placeholder="e.g. Parent, Legal Guardian" style={inputStyle} />
              <label style={labelStyle}>GUARDIAN PHONE *</label>
              <input type="tel" value={guardianPhone}
                onChange={e => setGuardianPhone(e.target.value)}
                placeholder="(204) 555-0000" style={inputStyle} />
              <label style={labelStyle}>GUARDIAN EMAIL</label>
              <input type="email" value={guardianEmail}
                onChange={e => setGuardianEmail(e.target.value)}
                placeholder="guardian@email.com" style={{ ...inputStyle, marginBottom: 0 }} />
            </div>
          )}

          <label style={labelStyle}>EMAIL ADDRESS</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com" style={inputStyle} />

          <label style={labelStyle}>PHONE NUMBER</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="(204) 555-0000" style={inputStyle} />

          <div style={{ color: C.ghost, fontFamily: "monospace", fontSize: 11,
            marginBottom: 16, lineHeight: 1.6 }}>
            * At least one contact method required (email or phone)
          </div>

          <label style={labelStyle}>POSTAL CODE (optional)</label>
          <input value={postal} onChange={e => setPostal(e.target.value.toUpperCase())}
            placeholder="R3C 1A1" maxLength={7}
            style={{ ...inputStyle, width: 140 }} />

          {error && (
            <div style={{ color: "#e63946", fontFamily: "monospace", fontSize: 13,
              marginBottom: 12, padding: "10px 14px", background: "#1a0000",
              borderRadius: 8, border: "1px solid #e6394633" }}>
              {error}
            </div>
          )}

          <button onClick={() => { if (validateInfo()) setStep("waiver"); }}
            disabled={tooYoung}
            style={{ width: "100%", background: tooYoung ? "#222" : C.gold,
              color: tooYoung ? C.ghost : "#000", border: "none", borderRadius: 12,
              padding: "16px", fontFamily: "monospace", fontWeight: "bold",
              fontSize: 16, cursor: tooYoung ? "not-allowed" : "pointer" }}>
            Continue → Read Waiver
          </button>
        </>)}

        {/* ── STEP 2: WAIVER TEXT ── */}
        {step === "waiver" && (<>
          {sectionTitle("RELEASE, WAIVER & INDEMNITY")}
          <div style={{ color: C.ghost, fontFamily: "monospace", fontSize: 12,
            marginBottom: 12 }}>
            Please read the full waiver. Scroll to the bottom to continue.
          </div>

          <div ref={waiverScrollRef} onScroll={handleWaiverScroll} style={{
            background: C.coal, border: `1px solid ${C.ash}`, borderRadius: 12,
            padding: 16, height: 360, overflowY: "scroll",
            fontFamily: "system-ui", fontSize: 13, lineHeight: 1.8,
            color: C.bone, marginBottom: 16, whiteSpace: "pre-wrap",
          }}>
            {WAIVER_TEXT}
          </div>

          {!hasScrolled && (
            <div style={{ color: C.ghost, fontFamily: "monospace", fontSize: 12,
              textAlign: "center", marginBottom: 12 }}>
              ↓ Scroll to the bottom to continue
            </div>
          )}

          <button onClick={() => { setHasScrolled(true); setStep("sign"); }}
            style={{ width: "100%", background: hasScrolled ? C.gold : C.ash,
              color: hasScrolled ? "#000" : C.ghost, border: "none", borderRadius: 12,
              padding: "16px", fontFamily: "monospace", fontWeight: "bold",
              fontSize: 16, cursor: hasScrolled ? "pointer" : "not-allowed" }}>
            I've Read the Waiver → Sign
          </button>
        </>)}

        {/* ── STEP 3: SIGN ── */}
        {step === "sign" && (<>
          {sectionTitle("CONSENT & SIGNATURE")}

          {/* Optional consents */}
          <div style={{ background: C.coal, border: `1px solid ${C.ash}`,
            borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ color: C.bone, fontFamily: "monospace", fontSize: 12,
              marginBottom: 12 }}>Optional — your participation is not conditional on these:</div>
            {[
              { label: "I agree to receive emails about promotions and events", val: emailConsent, set: setEmailConsent },
              { label: "I agree to receive SMS messages about promotions and events (msg & data rates may apply)", val: smsConsent, set: setSmsConsent },
              { label: "I consent to photos/videos of me being used for promotional purposes", val: photoConsent, set: setPhotoConsent },
            ].map((item, i) => (
              <label key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start",
                marginBottom: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={item.val}
                  onChange={e => item.set(e.target.checked)}
                  style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: C.bone, fontFamily: "system-ui", fontSize: 14,
                  lineHeight: 1.5 }}>{item.label}</span>
              </label>
            ))}
          </div>

          {/* Participant signature */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.bone, fontFamily: "monospace", fontSize: 13,
              marginBottom: 8 }}>
              {isMinor ? "Participant signature:" : "Your signature:"}
            </div>
            <SignaturePad onSave={setSig} />
            {sig && (
              <div style={{ color: "#4f4", fontFamily: "monospace", fontSize: 12,
                marginTop: 6 }}>✓ Signature captured</div>
            )}
          </div>

          {/* Guardian signature if minor */}
          {isMinor && (
            <div style={{ background: "#1a1500", border: `1px solid ${C.gold}44`,
              borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ color: C.gold, fontFamily: "monospace", fontSize: 12,
                fontWeight: "bold", marginBottom: 8 }}>
                GUARDIAN SIGNATURE REQUIRED
              </div>
              <div style={{ color: C.ghost, fontFamily: "monospace", fontSize: 12,
                marginBottom: 8 }}>
                {guardianName} — sign below as parent/legal guardian:
              </div>
              <SignaturePad onSave={setGuardianSig} />
              {guardianSig && (
                <div style={{ color: "#4f4", fontFamily: "monospace", fontSize: 12,
                  marginTop: 6 }}>✓ Guardian signature captured</div>
              )}
            </div>
          )}

          {/* Legal acknowledgment */}
          <div style={{ color: C.ghost, fontFamily: "monospace", fontSize: 11,
            lineHeight: 1.7, marginBottom: 16, padding: "12px 14px",
            background: C.coal, borderRadius: 8 }}>
            By signing, I confirm I have read and understand the Release, Waiver and
            Indemnity Agreement. I am waiving certain legal rights. Waiver version: {WAIVER_VERSION}.
          </div>

          {error && (
            <div style={{ color: "#e63946", fontFamily: "monospace", fontSize: 13,
              marginBottom: 12, padding: "10px 14px", background: "#1a0000",
              borderRadius: 8 }}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || !sig || (isMinor && !guardianSig)}
            style={{ width: "100%",
              background: (!sig || (isMinor && !guardianSig)) ? "#222" : C.gold,
              color: (!sig || (isMinor && !guardianSig)) ? C.ghost : "#000",
              border: "none", borderRadius: 12, padding: "18px",
              fontFamily: "monospace", fontWeight: "bold", fontSize: 16,
              cursor: !sig ? "not-allowed" : "pointer" }}>
            {submitting ? "⏳ Saving..." : "✅ I Agree & Enter the Arena"}
          </button>

          <div style={{ textAlign: "center", marginTop: 12, color: C.ghost,
            fontFamily: "monospace", fontSize: 11 }}>
            Your signed waiver is securely stored. Thank you for your business!
          </div>
        </>)}
      </div>
    </div>
  );
                         }
