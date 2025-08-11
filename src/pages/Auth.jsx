import React, { useEffect, useMemo, useState } from "react";
import { ID } from "appwrite";
import { account } from "../lib/appwrite";
import { useAuth } from "../contexts/AuthContext.jsx";
import { config } from "../lib/appwrite";

function useQueryParams() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

export default function Auth() {
  const { setUser } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Recovery / Verification state
  const [isReset, setIsReset] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");

  const qp = useQueryParams();

  useEffect(() => {
    const userId = qp.get("userId");
    const secret = qp.get("secret");
    const isVerify = qp.get("verify") === "1";
    const isRecovery = qp.get("recovery") === "1";

    if (userId && secret && isVerify) {
      // Complete email verification
      account.updateVerification(userId, secret)
        .then(() => setMessage("Email verified successfully."))
        .catch((e) => setError(e?.message || "Verification failed"));
    }

    if (userId && secret && isRecovery) {
      // Switch to reset form
      setIsReset(true);
    }
  }, [qp]);

  const resetState = () => { setMessage(""); setError(""); };

  const handleSignin = async (e) => {
    e.preventDefault(); resetState(); setLoading(true);
    try {
      await account.createEmailPasswordSession(email, password);
      const u = await account.get();
      setUser(u);
      setMessage("Signed in successfully.");
    } catch (err) {
      setError(err?.message || "Sign in failed");
    } finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault(); resetState(); setLoading(true);
    try {
      await account.create(ID.unique(), email, password, name || undefined);
      // Optional: auto login then send verification
      try {
        await account.createEmailPasswordSession(email, password);
        const u = await account.get();
        setUser(u);
      } catch {}
      const redirect = config.appBaseUrl || window.location.origin;
      await account.createVerification(redirect);
      setMessage("Account created. Verification email sent—please check your inbox.");
      setMode("signin");
    } catch (err) {
      setError(err?.message || "Sign up failed");
    } finally { setLoading(false); }
  };

  const handleGoogle = () => {
    const success = config.appBaseUrl || window.location.origin;
    const failure = success + "?auth_error=1";
    account.createOAuth2Session("google", success, failure);
  };

  const startRecovery = async () => {
    resetState(); setLoading(true);
    try {
      await account.createRecovery(email, (config.appBaseUrl || window.location.origin) + "?recovery=1");
      setMessage("Password recovery email sent.");
    } catch (e) { setError(e?.message || "Recovery failed"); }
    finally { setLoading(false); }
  };

  const applyRecovery = async (e) => {
    e.preventDefault(); resetState(); setLoading(true);
    const userId = qp.get("userId");
    const secret = qp.get("secret");
    if (!userId || !secret) { setError("Missing recovery params"); setLoading(false); return; }
    if (newPass !== newPass2) { setError("Passwords do not match"); setLoading(false); return; }
    try {
      await account.updateRecovery(userId, secret, newPass, newPass2);
      setMessage("Password reset successful. You can sign in now.");
      setIsReset(false); setMode("signin");
    } catch (e) { setError(e?.message || "Reset failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__tabs">
          <button className={`auth__tab ${mode === "signin" ? "is-active" : ""}`} onClick={() => setMode("signin")}>Sign in</button>
          <button className={`auth__tab ${mode === "signup" ? "is-active" : ""}`} onClick={() => setMode("signup")}>Sign up</button>
        </div>

        {isReset ? (
          <form className="auth__form" onSubmit={applyRecovery}>
            <label>
              <span>New password</span>
              <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required />
            </label>
            <label>
              <span>Confirm new password</span>
              <input type="password" value={newPass2} onChange={(e) => setNewPass2(e.target.value)} required />
            </label>
            <button type="submit" disabled={loading} className="button primary" style={{ width: "100%" }}>
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        ) : mode === "signin" ? (
          <form className="auth__form" onSubmit={handleSignin}>
            <label>
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              <span>Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button type="submit" disabled={loading} className="button primary" style={{ width: "100%" }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <button type="button" onClick={startRecovery} className="button ghost" style={{ width: "100%" }}>
              Forgot password
            </button>
            <button type="button" onClick={handleGoogle} className="button ghost" style={{ width: "100%" }}>
              Continue with Google
            </button>
          </form>
        ) : (
          <form className="auth__form" onSubmit={handleSignup}>
            <label>
              <span>Name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
            </label>
            <label>
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              <span>Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button type="submit" disabled={loading} className="button primary" style={{ width: "100%" }}>
              {loading ? "Creating..." : "Create account"}
            </button>
            <button type="button" onClick={handleGoogle} className="button ghost" style={{ width: "100%" }}>
              Continue with Google
            </button>
          </form>
        )}

        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error">{error}</div>}

        <p className="muted" style={{ marginTop: 8 }}>
          Email verification is sent after sign up. Configure redirects in Appwrite settings: {config.appBaseUrl}
        </p>
      </div>
    </div>
  );
}

