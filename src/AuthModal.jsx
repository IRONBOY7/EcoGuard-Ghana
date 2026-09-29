import { useState } from "react";
import { X } from "lucide-react";
import "./EarthEngineModal.css";
import { registerUser, signInUser } from "./firebase";
import { createUserProfile } from "./api";

function friendlyError(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential")) return "Incorrect email or password.";
  if (code.includes("email-already-in-use"))
    return "An account with this email already exists — try signing in.";
  if (code.includes("invalid-email")) return "That email address looks invalid.";
  if (code.includes("network-request-failed"))
    return "Network error — check your connection and retry.";
  return err?.message || "Authentication failed.";
}

/**
 * Authority/citizen sign-in. Registration creates a `citizen` profile;
 * authority/admin roles are assigned by an administrator afterwards.
 */
export default function AuthModal({ notice, onClose, onAuthed }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event?.preventDefault();
    setError("");
    if (!email.trim() || password.length < 6) {
      setError("Enter a valid email and a password of 6+ characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        if (!name.trim()) {
          setError("Please enter your name.");
          setBusy(false);
          return;
        }
        const cred = await registerUser(email.trim(), password);
        await createUserProfile(cred.user.uid, {
          name: name.trim(),
          email: email.trim(),
        });
        onAuthed(cred.user);
      } else {
        const cred = await signInUser(email.trim(), password);
        onAuthed(cred.user);
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="eeOverlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in"
    >
      <div className="eeCard" onClick={(e) => e.stopPropagation()}>
        <button className="eeX" onClick={onClose} aria-label="Close">
          <X size={17} />
        </button>
        <div className="eeHead">
          <h3>{mode === "login" ? "Authority sign-in" : "Create account"}</h3>
        </div>
        {notice && <p className="authNote">{notice}</p>}
        <form onSubmit={submit}>
          {mode === "register" && (
            <label className="eeField">
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ama Mensah"
                autoComplete="name"
              />
            </label>
          )}
          <label className="eeField">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@authority.gov.gh"
              autoComplete="email"
            />
          </label>
          <label className="eeField">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {error && (
            <div className="eeErr" role="alert">
              {error}
            </div>
          )}
          <div className="eeBtns">
            <button className="primary" type="submit" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
            <button className="ghost" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
        <p className="authSwitch">
          {mode === "login" ? (
            <>
              No account yet?{" "}
              <button
                type="button"
                className="linkBtn"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already registered?{" "}
              <button
                type="button"
                className="linkBtn"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
        <p className="authFine">
          New accounts join as citizens. Authority and admin access is assigned
          by an administrator.
        </p>
      </div>
    </div>
  );
}
