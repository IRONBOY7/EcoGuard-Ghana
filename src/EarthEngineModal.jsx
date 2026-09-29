import { useEffect, useState } from "react";
import { KeyRound, Satellite, X } from "lucide-react";
import "./EarthEngineModal.css";

/**
 * Bring-your-own-account Earth Engine gate.
 * Every user connects with their OWN account + personal Client ID —
 * EcoGuard stores no shared key (browser localStorage only).
 */
export default function EarthEngineModal({ initial, onClose, onConnect }) {
  const [own, setOwn] = useState(!!initial?.ownAccount);
  const [clientId, setClientId] = useState(initial?.clientId || "");
  const [projectId, setProjectId] = useState(initial?.projectId || "");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const submit = () => {
    const id = clientId.trim();
    if (!own) {
      setError("Please confirm you created your own Earth Engine account first.");
      return;
    }
    if (!id) {
      setError("Your personal OAuth 2.0 Client ID is required.");
      return;
    }
    if (!/\.apps\.googleusercontent\.com$/.test(id)) {
      setError(
        "That doesn't look like an OAuth Client ID — it should end with .apps.googleusercontent.com."
      );
      return;
    }
    onConnect({ clientId: id, projectId: projectId.trim() });
  };

  return (
    <div
      className="eeOverlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Connect Google Earth Engine"
    >
      <div className="eeCard" onClick={(e) => e.stopPropagation()}>
        <button className="eeX" onClick={onClose} aria-label="Close">
          <X size={17} />
        </button>
        <div className="eeHead">
          <span className="eeBadge">
            <Satellite size={22} />
          </span>
          <h3>Connect Google Earth Engine</h3>
        </div>
        <p className="eeNote">
          EcoGuard pulls live <b>Sentinel-2</b> satellite imagery for Ghana and
          computes real before/after change detection for each site using{" "}
          <b>your own</b> Google Earth Engine account. Access to the Google
          Earth satellite view requires your personal token — EcoGuard provides
          no shared key.
        </p>

        <div className="eeBox">
          <div className="eeBoxHead">
            <KeyRound size={15} /> Create your own Earth Engine account first
          </div>
          <p>
            Every user who clicks the Google Earth satellite view must create
            and use <b>their own</b> Earth Engine account. Earth Engine is free
            for education and research.
          </p>
          <a
            className="primary full"
            href="https://signup.earthengine.google.com/"
            target="_blank"
            rel="noreferrer"
          >
            Create my Own Earth Engine Account →
          </a>
          <label className="eeCheck">
            <input
              type="checkbox"
              checked={own}
              onChange={(e) => setOwn(e.target.checked)}
            />
            <span>
              I have created my <b>own</b> Earth Engine account and I will use
              my personal token.
            </span>
          </label>
        </div>

        <label className="eeField">
          Your personal OAuth 2.0 Client ID{" "}
          <span className="opt">(your token — required)</span>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="1234567890-xxxx.apps.googleusercontent.com"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="eeField">
          Cloud Project ID <span className="opt">(optional)</span>
          <input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="my-earth-engine-project"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        {error && (
          <div className="eeErr" role="alert">
            {error}
          </div>
        )}

        <div className="eeBtns">
          <button className="primary" onClick={submit}>
            Connect with my Earth Engine account
          </button>
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
