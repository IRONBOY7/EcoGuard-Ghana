import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, AlertTriangle, ArrowRight, Bell, CheckCircle2, ChevronRight,
  Globe2, Leaf, MapPinned, Menu, Satellite, ShieldCheck, TreePine, X, Zap
} from "lucide-react";
import "./styles.css";
import MonitoringCoverage from "./MonitoringCoverage";
import SatelliteMap, { latestDailyDate } from "./SatelliteMap";
import BeforeAfterComparison from "./BeforeAfterComparison";
import EarthEngineModal from "./EarthEngineModal";
import AuthModal from "./AuthModal";
import {
  isFirebaseConfigured,
  signOutUser,
  watchAuth,
} from "./firebase";
import {
  buildSummary,
  fetchAgencies,
  fetchAlerts,
  legacyVerify,
  requestVerification,
  submitVerificationEvidence,
  uploadEvidence,
} from "./api";

// Public Earth Engine App URL (optional). Empty until the app is published.
const EE_APP_URL = import.meta.env.VITE_EE_APP_URL || "#";

const api = async (path) => (await fetch(path)).json();

// Installable mobile web app: service worker only in production builds,
// never in dev (so local iteration is never served stale).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

function App() {
  const [menu, setMenu] = useState(false);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [apiStatus, setApiStatus] = useState("Connecting");
  const [authUser, setAuthUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [evFile, setEvFile] = useState(null);
  const [evNotes, setEvNotes] = useState("");
  const [feedMode, setFeedMode] = useState("esri");
  const [feedDate] = useState(latestDailyDate());
  const [eeOpen, setEeOpen] = useState(false);
  const [ee, setEe] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("eg_ee_config")) ?? { connected: false, clientId: "", projectId: "" };
    } catch {
      return { connected: false, clientId: "", projectId: "" };
    }
  });
  const eeConnect = ({ clientId, projectId }) => {
    const cfg = { connected: true, clientId, projectId, ts: Date.now() };
    try { localStorage.setItem("eg_ee_config", JSON.stringify(cfg)); } catch {}
    setEe(cfg);
    setEeOpen(false);
  };
  const eeDisconnect = () => {
    try { localStorage.removeItem("eg_ee_config"); } catch {}
    setEe({ connected: false, clientId: "", projectId: "" });
  };

  useEffect(() => watchAuth(setAuthUser), []);
  useEffect(() => { setEvFile(null); setEvNotes(""); }, [selected?.id]);
  useEffect(() => {
    Promise.all([
      fetchAlerts(),
      fetchAgencies(),
      api("/api/health"),
    ]).then(([a, g, h]) => {
      setAlerts(a); setAgencies(g);
      setSummary(buildSummary(a));
      setApiStatus(h.status === "online" ? "Online" : "Offline");
    }).catch(() => setApiStatus("Offline"));
  }, []);

  // Cloud-Function error codes that mean "backend not deployed yet" —
  // fall back to the Express demo API so the demo keeps working.
  const FIREBASE_FALLBACK_CODES = [
    "functions/unavailable",
    "functions/internal",
    "functions/not-found",
    "functions/failed-precondition",
    "functions/deadline-exceeded",
    "functions/unimplemented",
    "functions/unknown",
  ];
  const applyVerified = (id) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "Field verification requested" } : a));
  };
  const verify = async (id) => {
    const target = alerts.find((a) => a.id === id);
    if (isFirebaseConfigured() && target?.firebaseDocId) {
      if (!authUser) {
        setAuthNotice("Sign in to request field verification.");
        setAuthOpen(true);
        return;
      }
      try {
        await requestVerification(target.firebaseDocId, "");
        applyVerified(id);
      } catch (err) {
        if (FIREBASE_FALLBACK_CODES.includes(err.code)) {
          console.info("Firebase backend unavailable, using demo API.");
          const fallback = await legacyVerify(id);
          if (fallback.alert) applyVerified(id);
          return;
        }
        setActionError(err.message || "Verification request failed.");
      }
      return;
    }
    const result = await legacyVerify(id);
    if (result.alert) applyVerified(id);
  };

  const submitEvidence = async () => {
    if (!selected?.firebaseDocId) return;
    setActionError("");
    try {
      const req = await requestVerification(selected.firebaseDocId, evNotes);
      let photoPath;
      if (evFile) photoPath = await uploadEvidence(selected.firebaseDocId, evFile);
      await submitVerificationEvidence({ verificationId: req.verificationId, photoPath, notes: evNotes });
      applyVerified(selected.id);
      setSelected(null);
    } catch (err) {
      if (FIREBASE_FALLBACK_CODES.includes(err.code)) {
        console.info("Firebase backend unavailable, using demo API.");
        await legacyVerify(selected.id);
        setSelected(null);
        return;
      }
      setActionError(err.message || "Evidence submission failed.");
    }
  };

  const handleLogout = async () => {
    try { await signOutUser(); } catch {}
    setAuthUser(null);
  };

  return <>
    <header className="nav">
      <a className="brand" href="#home"><span className="brandMark"><Globe2 size={22}/><Satellite size={15}/></span><span className="brandText"><span>EcoGuard <b>Ghana</b></span><small>Satellite Environmental Monitoring</small></span></a>
      <button className="menuBtn" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
      <nav className={menu ? "open" : ""}>
        {["Home","How It Works","Monitoring","Alerts","Agencies","About"].map(x =>
          <a key={x} href={"#"+x.toLowerCase().replaceAll(" ","-")} onClick={()=>setMenu(false)}>{x}</a>
        )}
        <a className="navCta" href="#monitoring">Launch Dashboard <ArrowRight size={16}/></a>
        {authUser ? (
          <span className="navUser"><i>{(authUser.displayName || authUser.email || "?").charAt(0).toUpperCase()}</i><button type="button" onClick={handleLogout}>Sign out</button></span>
        ) : (
          <button type="button" className="navSign" onClick={() => { setAuthNotice(""); setAuthOpen(true); }}>Sign in</button>
        )}
      </nav>
    </header>

    <main>
      <section id="home" className="hero">
        <div className="heroText">
          <div className="eyebrow"><span></span> SATELLITE-POWERED ENVIRONMENTAL MONITORING</div>
          <h1><span className="hlWhite">Detect Land disturbance.</span><br /><span className="hlGreen">Protect Ghana</span></h1>
          <p>EcoGuard Ghana is a prototype platform for detecting environmental change, locating potential land disturbance, and helping authorities prioritize field verification.</p>
          <div className="actions">
            <a className="primary" href="#monitoring">Launch Monitoring Dashboard <ArrowRight size={18}/></a>
            <a className="secondary" href="#how-it-works">Explore the system</a>
          </div>
          <div className="status"><span className={apiStatus==="Online"?"dot live":"dot"}></span> EcoGuard API <b>{apiStatus}</b> <span>•</span> Demo environment</div>
        </div>
        <div className="heroVisual">
          <MonitoringCoverage />
        </div>
      </section>

      <section className="stats">
        <Stat icon={<MapPinned/>} value={summary?.monitoredZones ?? "—"} label="Monitoring zones"/>
        <Stat icon={<AlertTriangle/>} value={summary?.activeAlerts ?? "—"} label="Active demo alerts"/>
        <Stat icon={<Zap/>} value={summary?.highRisk ?? "—"} label="High-risk alerts"/>
        <Stat icon={<CheckCircle2/>} value={summary?.verified ?? "—"} label="Cases verified"/>
      </section>

      <section id="how-it-works" className="section">
        <SectionTitle kicker="THE ECOGUARD METHOD" title="From satellite imagery to action." text="The prototype turns imagery and geographic information into a structured workflow. Every automated detection remains subject to human field verification."/>
        <div className="pipeline">
          {["Satellite Data","Classification","AI Change Detection","GIS Location","Risk Assessment","Alert","Authority","Field Verification"].map((x,i)=>
            <div className="step" key={x}><span>{String(i+1).padStart(2,"0")}</span><strong>{x}</strong>{i<7 && <ChevronRight/>}</div>
          )}
        </div>
      </section>

      <section id="monitoring" className="section dark">
        <div className="sectionHead"><div><div className="eyebrow">MONITORING DASHBOARD</div><h2>See the environmental picture.</h2></div><a className="outline" href="#alerts">View alerts <ArrowRight size={16}/></a></div>
        <div className="dashboard">
          <div className="mapPanel">
            <div className="mapToolbar"><span><Satellite size={16}/> Satellite monitoring</span><span>Esri + NASA daily</span></div>
            <SatelliteMap alerts={alerts} onSelect={setSelected} mode={feedMode} onModeChange={setFeedMode} date={feedDate} />
          </div>
          <div className="sidePanel">
            <h3>Detection overview</h3><p className="muted">Demo results illustrate how a live monitoring service could surface potential changes.</p>
            <div className="feedLine"><span className={feedMode==="daily"?"dot live":"dot"}></span><span>{feedMode==="daily" ? `Live feed · NASA MODIS Terra · ${feedDate} · updates daily` : "Base map · Esri World Imagery · updated periodically"}</span></div>
            <div className="metric"><span>Vegetation change</span><b>+18.4%</b><div><i style={{width:"72%"}}></i></div></div>
            <div className="metric"><span>Exposed land</span><b>+11.7%</b><div><i style={{width:"51%"}}></i></div></div>
            <div className="metric"><span>Water proximity</span><b>2 alerts</b><div><i style={{width:"35%"}}></i></div></div>
            <a className="primary full" href="#alerts">Open alert centre <ArrowRight size={17}/></a>
          </div>
        </div>
      </section>

      <BeforeAfterComparison />

      <section id="alerts" className="section">
        <SectionTitle kicker="ALERT CENTRE" title="Potential disturbances, organized for response." text="These are demonstration alerts. A production system would connect verified satellite datasets, detection models, GIS services and authorized response workflows."/>
        <div className="alertGrid">
          {alerts.map(a=><article className="alertCard" key={a.id}>
            <div className="alertTop"><span className={`risk ${a.risk.toLowerCase()}`}>{a.risk} risk</span><small>{a.id}</small></div>
            <h3>{a.location}</h3><p>{a.change}</p>
            <div className="alertMeta"><span><Activity size={15}/> {a.date}</span><span><MapPinned size={15}/> {a.lat.toFixed(3)}, {a.lng.toFixed(3)}</span></div>
            <div className="alertBottom"><span className="statusText"><Bell size={15}/> {a.status}</span><button onClick={()=>verify(a.id)}>Request verification</button></div>
          </article>)}
        </div>
      </section>

      <section id="agencies" className="section agencySection">
        <SectionTitle kicker="COLLABORATION" title="Designed around Ghana's environmental response ecosystem." text="EcoGuard Ghana is intended as a supporting information layer—not a replacement for official authority, investigation or enforcement."/>
        <div className="agencyGrid">{agencies.map((a,i)=><div className="agency" key={a.name}><span>0{i+1}</span><ShieldCheck/><h3>{a.name}</h3><p>{a.role}</p></div>)}</div>
      </section>

      <section className="section earth">
        <div><div className="eyebrow">EARTH ENGINE CONNECTION</div><h2>Explore the monitoring data.</h2><p>Connect the prototype to your EcoGuard Ghana Google Earth Engine application when your app is ready. Keep the destination public only if the underlying Earth Engine app is configured for public access.</p>
        {ee.connected
          ? <p className="eeStatus"><CheckCircle2 size={15}/> Connected with your own account · <button type="button" className="linkBtn" onClick={eeDisconnect}>Disconnect</button></p>
          : <p className="eeStatus dim"><Satellite size={15}/> Every user connects with their own Earth Engine account — no shared key.</p>}
        </div>
        <div className="earthActions">
          {ee.connected && EE_APP_URL !== "#"
            ? <a className="primary" href={EE_APP_URL} target="_blank" rel="noreferrer">Open EcoGuard Ghana Earth Engine App <ArrowRight size={17}/></a>
            : <button type="button" className="primary" onClick={() => setEeOpen(true)}>Open EcoGuard Ghana Earth Engine App <ArrowRight size={17}/></button>}
          <a className="secondary" href="https://earth.google.com/web/search/Ghana" target="_blank" rel="noreferrer">Explore Historical Images <ArrowRight size={17}/></a>
          {ee.connected && EE_APP_URL === "#" && <p className="eeHint">Set EE_APP_URL in src/main.jsx to point at your public app.</p>}
        </div>
      </section>
      {eeOpen && <EarthEngineModal initial={ee} onClose={() => setEeOpen(false)} onConnect={eeConnect} />}
      {authOpen && <AuthModal notice={authNotice} onClose={() => setAuthOpen(false)} onAuthed={(u) => { setAuthUser(u); setAuthOpen(false); }} />}
      {actionError && <div className="actionToast" onClick={() => setActionError("")}>{actionError} · dismiss</div>}

      <section id="about" className="section about">
        <div className="aboutIcon"><Leaf size={40}/></div>
        <div><div className="eyebrow">ABOUT THE PROJECT</div><h2>Technology that supports people protecting the environment.</h2><p>EcoGuard Ghana is a student innovation prototype combining satellite data, AI-assisted change detection, GIS location and human verification to address illegal mining and environmental degradation.</p><div className="pillRow"><span>Satellite Data</span><span>AI</span><span>GIS</span><span>Human Verification</span></div></div>
      </section>
    </main>

    <footer><div className="brand"><span className="brandMark"><Globe2 size={20}/><Satellite size={13}/></span><span>EcoGuard <b>Ghana</b></span></div><span>Detect. Alert. Protect and Restore.</span><small>Prototype • Demo data only</small></footer>

    {selected && <div className="modal" onClick={()=>setSelected(null)}><div className="modalBox" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}><X/></button><div className="eyebrow">DETECTION {selected.id}</div><h2>{selected.location}</h2><p>{selected.change}</p><div className="modalStats"><b>{selected.risk}<small>Risk level</small></b><b>{selected.date}<small>Detection date</small></b><b>{selected.lat.toFixed(3)}<small>Latitude</small></b></div><button className="primary full" onClick={()=>{verify(selected.id);setSelected(null)}}>Request field verification</button>{authUser && selected.firebaseDocId && (<div className="evBlock"><label className="evLabel">Verification photo (optional)<input type="file" accept="image/*" onChange={(e)=>setEvFile(e.target.files ? e.target.files[0] : null)} /></label><input className="evNotes" value={evNotes} onChange={(e)=>setEvNotes(e.target.value)} placeholder="Field notes (optional)" /><button className="primary full" onClick={submitEvidence}>Submit verification evidence</button></div>)}</div></div>}
  </>;
}

function Stat({icon,value,label}){return <div className="stat"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>}
function SectionTitle({kicker,title,text}){return <div className="sectionTitle"><div className="eyebrow">{kicker}</div><h2>{title}</h2><p>{text}</p></div>}

createRoot(document.getElementById("root")).render(<App />);