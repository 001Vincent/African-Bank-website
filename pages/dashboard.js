import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Navbar from "../components/Navbar";
import RateTicker, { useRates, LABELS } from "../components/RateTicker";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [currency, setCurrency] = useState("USD");
  const { rates, updatedAt } = useRates();

  const [photoError, setPhotoError] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);

  const DISPLAY_CURRENCIES = ["USD", "GBP", "JPY", "NGN", "EUR", "ZAR"];

  function handlePhotoSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoError("");

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      return;
    }
    if (file.size > 1_500_000) {
      setPhotoError("That image is too large. Please use a photo under ~1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setPhotoLoading(true);
      try {
        const res = await fetch("/api/profile/photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoUrl: reader.result }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not save photo.");
        setUser(data.user);
      } catch (err) {
        setPhotoError(err.message);
      } finally {
        setPhotoLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function removePhoto() {
    setPhotoLoading(true);
    setPhotoError("");
    try {
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove photo.");
      setUser(data.user);
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setPhotoLoading(false);
    }
  }

  // Withdrawal flow: 'form' -> 'pin' -> 'processing' -> 'success'
  const [wStep, setWStep] = useState(null);
  const [wForm, setWForm] = useState({ toAccountNumber: "", amount: "", currency: "USD" });
  const [wPin, setWPin] = useState("");
  const [wPinConfirm, setWPinConfirm] = useState("");
  const [wError, setWError] = useState("");
  const [wResult, setWResult] = useState(null);

  const hasPin = Boolean(user && user.pinHash);

  function openWithdraw() {
    setWForm({ toAccountNumber: "", amount: "", currency: "USD" });
    setWPin("");
    setWPinConfirm("");
    setWError("");
    setWResult(null);
    setWStep("form");
  }

  function closeWithdraw() {
    setWStep(null);
  }

  function submitWithdrawForm(e) {
    e.preventDefault();
    setWError("");
    if (!wForm.toAccountNumber.trim()) {
      setWError("Enter the receiving account number.");
      return;
    }
    if (!Number(wForm.amount) || Number(wForm.amount) <= 0) {
      setWError("Enter an amount greater than 0.");
      return;
    }
    setWStep("pin");
  }

  async function submitPin(e) {
    e.preventDefault();
    setWError("");

    if (wPin.length < 4) {
      setWError("PIN must be at least 4 digits.");
      return;
    }
    if (!hasPin && wPin !== wPinConfirm) {
      setWError("PINs do not match.");
      return;
    }

    setWStep("processing");
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAccountNumber: wForm.toAccountNumber,
          amount: Number(wForm.amount),
          currency: wForm.currency,
          pin: wPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed.");

      setUser(data.user);
      setTransactions((prev) => [data.transaction, ...prev]);
      setWResult(data);
      setWStep("success");
    } catch (err) {
      setWError(err.message);
      setWStep("pin");
    }
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.replace("/login");
        } else {
          setUser(d.user);
          fetch("/api/transactions")
            .then((r) => r.json())
            .then((t) => setTransactions(t.transactions || []));
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return (
      <div>
        <Navbar user={null} onLogout={() => {}} />
        <div className="center-msg">Loading your dashboard…</div>
      </div>
    );
  }

  if (!user) return null;

  const SYMBOLS = { USD: "$", GBP: "£", JPY: "¥", NGN: "₦", EUR: "€", ZAR: "R" };

  function convertedBalance() {
    if (currency === "USD") return `$${user.balance.toLocaleString()}`;
    if (!rates || rates[currency] == null) return "…";
    const value = user.balance * rates[currency];
    const decimals = currency === "JPY" ? 0 : 2;
    return `${SYMBOLS[currency] || ""}${value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />
      <RateTicker />

      <div className="dash-header">
        <div className="container">
          <div>
            <div className="dash-eyebrow">Personal account</div>
            <h1 style={{ color: "#fff" }}>Welcome, {user.fullName.split(" ")[0]}.</h1>
          </div>
        </div>
      </div>

      <div className="dash-body">
        <div className="container">
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="panel-head">
              <h3>Passport photo</h3>
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "center", padding: 22 }}>
              <div className="passport-box">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="Passport" />
                ) : (
                  <span className="passport-placeholder">No photo</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                {photoError && <div className="error-banner">{photoError}</div>}
                <p className="field-hint" style={{ marginBottom: 12 }}>
                  Upload a clear, passport-style photo for your account. JPG or PNG, under 1MB.
                </p>
                <div className="row-actions">
                  <label className="mini-btn success" style={{ cursor: "pointer" }}>
                    {photoLoading ? "Saving…" : user.photoUrl ? "Change photo" : "Upload photo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      disabled={photoLoading}
                      style={{ display: "none" }}
                    />
                  </label>
                  {user.photoUrl && (
                    <button className="mini-btn danger" onClick={removePhoto} disabled={photoLoading}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Account balance</span>
                <select
                  className="currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ padding: "3px 8px", fontSize: 11.5 }}
                >
                  {DISPLAY_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="stat-value">{convertedBalance()}</div>
              {currency !== "USD" && (
                <div className="field-hint">${user.balance.toLocaleString()} USD actual balance</div>
              )}
            </div>
            <div className="stat-card">
              <div className="stat-label">Account number</div>
              <div className="stat-value">{user.accountNumber}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Status</div>
              <div className="stat-value">
                <span className={`badge ${user.status === "active" ? "badge-active" : "badge-suspended"}`}>
                  {user.status}
                </span>
              </div>
            </div>
          </div>

          <div className="row-actions" style={{ marginBottom: 24 }}>
            <button className="mini-btn success" style={{ padding: "10px 18px" }} onClick={openWithdraw}>
              Withdraw funds
            </button>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Live exchange rates</h3>
              <span style={{ fontSize: 12, color: "#5C6B80" }}>
                {updatedAt ? `Updated ${updatedAt}` : "Loading…"}
              </span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Currency</th>
                  <th>Code</th>
                  <th>Rate per 1 USD</th>
                </tr>
              </thead>
              <tbody>
                {["USD", "GBP", "JPY", "EUR", "NGN", "ZAR", "KES", "GHS"].map((code) =>
                  rates && rates[code] != null ? (
                    <tr key={code}>
                      <td>{LABELS[code]}</td>
                      <td>{code}</td>
                      <td>{code === "USD" ? "1.0000" : Number(rates[code]).toFixed(code === "JPY" ? 2 : 4)}</td>
                    </tr>
                  ) : null
                )}
              </tbody>
            </table>
          </div>

          <div className="panel" style={{ marginTop: 24 }}>
            <div className="panel-head">
              <h3>Transaction history</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Details</th>
                  <th>Amount</th>
                  <th>Balance after</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id}>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={`badge ${t.type === "withdrawal" ? "badge-suspended" : "badge-deposit"}`}
                        style={{ marginBottom: 4, display: "inline-block" }}
                      >
                        {t.type}
                      </span>
                      <div style={{ fontSize: 13, color: "#1a2b3d" }}>{t.message}</div>
                      {t.note && <div className="field-hint" style={{ marginTop: 2 }}>{t.note}</div>}
                    </td>
                    <td style={{ color: t.type === "withdrawal" ? "#C0392B" : "#1E8A5F" }}>
                      {t.type === "withdrawal" ? "-" : "+"}$
                      {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>${t.balanceAfter.toLocaleString()}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "#5C6B80" }}>
                      No transactions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {wStep && (
        <div className="modal-overlay" onClick={wStep === "processing" ? undefined : closeWithdraw}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {wStep === "form" && (
              <>
                <h3>Withdraw funds</h3>
                <p className="auth-sub">
                  From account {user.accountNumber} · Available ${user.balance.toLocaleString()} USD
                </p>
                {wError && <div className="error-banner">{wError}</div>}
                <form onSubmit={submitWithdrawForm}>
                  <div className="field">
                    <label htmlFor="w-to">Receiving account number</label>
                    <input
                      id="w-to"
                      value={wForm.toAccountNumber}
                      onChange={(e) => setWForm({ ...wForm, toAccountNumber: e.target.value })}
                      placeholder="e.g. 1234567890"
                      autoFocus
                    />
                  </div>
                  <div className="field" style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 2 }}>
                      <label htmlFor="w-amount">Amount</label>
                      <input
                        id="w-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={wForm.amount}
                        onChange={(e) => setWForm({ ...wForm, amount: e.target.value })}
                        placeholder="e.g. 40000"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="w-currency">Currency</label>
                      <select
                        id="w-currency"
                        className="currency-select"
                        style={{ width: "100%", padding: "11px 13px" }}
                        value={wForm.currency}
                        onChange={(e) => setWForm({ ...wForm, currency: e.target.value })}
                      >
                        {DISPLAY_CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="row-actions" style={{ marginTop: 8 }}>
                    <button className="btn-block" style={{ margin: 0 }} type="submit">
                      Send
                    </button>
                    <button type="button" className="mini-btn" onClick={closeWithdraw}>
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}

            {wStep === "pin" && (
              <>
                <h3>{hasPin ? "Enter transaction PIN" : "Create a transaction PIN"}</h3>
                <p className="auth-sub">
                  {hasPin
                    ? "Confirm this withdrawal with your PIN."
                    : "This is your first withdrawal — set a PIN to protect future transactions."}
                </p>
                {wError && <div className="error-banner">{wError}</div>}
                <form onSubmit={submitPin}>
                  <div className="field">
                    <label htmlFor="w-pin">{hasPin ? "PIN" : "New PIN (4–6 digits)"}</label>
                    <input
                      id="w-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={wPin}
                      onChange={(e) => setWPin(e.target.value.replace(/\D/g, ""))}
                      autoFocus
                    />
                  </div>
                  {!hasPin && (
                    <div className="field">
                      <label htmlFor="w-pin-confirm">Confirm PIN</label>
                      <input
                        id="w-pin-confirm"
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={wPinConfirm}
                        onChange={(e) => setWPinConfirm(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                  )}
                  <div className="row-actions" style={{ marginTop: 8 }}>
                    <button className="btn-block" style={{ margin: 0 }} type="submit">
                      Confirm
                    </button>
                    <button type="button" className="mini-btn" onClick={() => setWStep("form")}>
                      Back
                    </button>
                  </div>
                </form>
              </>
            )}

            {wStep === "processing" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div className="spinner" />
                <p style={{ marginTop: 16, color: "#5C6B80" }}>Processing your withdrawal…</p>
              </div>
            )}

            {wStep === "success" && wResult && (
              <div style={{ textAlign: "center" }}>
                <div className="success-check">✓</div>
                <h3 style={{ marginTop: 14 }}>Withdrawal successful</h3>
                <p className="auth-sub">{wResult.transaction.message}</p>
                <div className="field-hint" style={{ marginBottom: 18 }}>
                  New balance: ${wResult.user.balance.toLocaleString()} USD
                  <br />
                  {wResult.emailSent
                    ? "A receipt has been emailed to you."
                    : "Email receipt could not be sent (SMTP not configured on this server)."}
                </div>
                <button className="btn-block" style={{ margin: 0 }} onClick={closeWithdraw}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="footer">© {new Date().getFullYear()} Unions Africa Bank.</div>
    </div>
  );
}
