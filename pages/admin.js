import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Navbar from "../components/Navbar";
import RateTicker from "../components/RateTicker";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [funding, setFunding] = useState(null); // user being funded
  const [depositAmount, setDepositAmount] = useState("");
  const [depositCurrency, setDepositCurrency] = useState("NGN");
  const [fromName, setFromName] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositError, setDepositError] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);

  const CURRENCIES = ["NGN", "USD", "GBP", "JPY", "EUR", "ZAR"];

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "admin") {
          router.replace("/login");
          return null;
        }
        setUser(d.user);
        return fetch("/api/admin/users").then((r) => r.json());
      })
      .then((d) => {
        if (d && d.users) setUsers(d.users);
      })
      .catch(() => setError("Could not load users."))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  async function toggleStatus(u) {
    const nextStatus = u.status === "active" ? "suspended" : "active";
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u._id, status: nextStatus }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers(users.map((x) => (x._id === u._id ? data.user : x)));
    }
  }

  function openFunding(u) {
    setFunding(u);
    setDepositAmount("");
    setDepositCurrency("NGN");
    setFromName(user.fullName);
    setDepositNote("");
    setDepositError("");
  }

  async function submitDeposit() {
    setDepositError("");
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) {
      setDepositError("Enter a deposit amount greater than 0.");
      return;
    }
    setDepositLoading(true);
    try {
      const res = await fetch("/api/admin/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: funding._id,
          amount: amt,
          currency: depositCurrency,
          fromName,
          note: depositNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deposit failed.");
      setUsers(users.map((x) => (x._id === funding._id ? data.user : x)));
      setFunding(null);
    } catch (err) {
      setDepositError(err.message);
    } finally {
      setDepositLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Navbar user={null} onLogout={() => {}} />
        <div className="center-msg">Loading admin dashboard…</div>
      </div>
    );
  }

  if (!user) return null;

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />
      <RateTicker />

      <div className="dash-header">
        <div className="container">
          <div>
            <div className="dash-eyebrow">Admin</div>
            <h1 style={{ color: "#fff" }}>Account overview</h1>
          </div>
        </div>
      </div>

      <div className="dash-body">
        <div className="container">
          {error && <div className="error-banner">{error}</div>}

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total accounts</div>
              <div className="stat-value">{totalUsers}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active accounts</div>
              <div className="stat-value">{activeUsers}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total balance held</div>
              <div className="stat-value">${totalBalance.toLocaleString()}</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>All customers</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Account No.</th>
                  <th>Role</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>{u.accountNumber}</td>
                    <td>
                      <span className={`badge ${u.role === "admin" ? "badge-admin" : "badge-user"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>${(u.balance || 0).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${u.status === "active" ? "badge-active" : "badge-suspended"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="mini-btn success" onClick={() => openFunding(u)}>
                          Fund account
                        </button>
                        <button
                          className={`mini-btn ${u.status === "active" ? "danger" : "success"}`}
                          onClick={() => toggleStatus(u)}
                        >
                          {u.status === "active" ? "Suspend" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "#5C6B80" }}>
                      No customers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {funding && (
        <div className="modal-overlay" onClick={() => setFunding(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Fund {funding.fullName}'s account</h3>
            <p className="auth-sub">
              Account {funding.accountNumber} · Current balance ${(funding.balance || 0).toLocaleString()}
            </p>
            {depositError && <div className="error-banner">{depositError}</div>}
            <div className="field">
              <label htmlFor="deposit-from">From</label>
              <input
                id="deposit-from"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Sender name"
                autoFocus
              />
            </div>
            <div className="field" style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 2 }}>
                <label htmlFor="deposit-amount">Amount</label>
                <input
                  id="deposit-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 500000"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="deposit-currency">Currency</label>
                <select
                  id="deposit-currency"
                  className="currency-select"
                  style={{ width: "100%", padding: "11px 13px" }}
                  value={depositCurrency}
                  onChange={(e) => setDepositCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="deposit-note">Note (optional)</label>
              <input
                id="deposit-note"
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
                placeholder="e.g. Branch cash deposit"
              />
            </div>
            {depositAmount && Number(depositAmount) > 0 && (
              <div className="field-hint" style={{ marginBottom: 14 }}>
                Receipt preview: "Deposit successful from {fromName || "…"} To {funding.fullName} | Amount{" "}
                {depositCurrency === "NGN" ? "₦" : depositCurrency === "USD" ? "$" : depositCurrency === "GBP" ? "£" : depositCurrency === "JPY" ? "¥" : depositCurrency === "EUR" ? "€" : "R"}
                {Number(depositAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"
              </div>
            )}
            <div className="row-actions" style={{ marginTop: 8 }}>
              <button className="btn-block" style={{ margin: 0 }} onClick={submitDeposit} disabled={depositLoading}>
                {depositLoading ? "Processing…" : "Confirm deposit"}
              </button>
              <button className="mini-btn" onClick={() => setFunding(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="footer">© {new Date().getFullYear()} Unions Africa Bank — Admin console.</div>
    </div>
  );
}
