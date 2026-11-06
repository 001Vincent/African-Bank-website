import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import RateTicker, { useRates, LABELS } from "../components/RateTicker";

export default function Home() {
  const [user, setUser] = useState(null);
  const { rates } = useRates();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  }

  const heroPairs = ["GBP", "JPY", "USD"];

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />
      <RateTicker />

      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="eyebrow">Pan-African banking, built for today</div>
            <h1>Banking that moves with Africa's ambition.</h1>
            <p className="lead">
              Unions Africa Bank gives you a secure account, transparent rates, and a
              dashboard built to keep you in control of your money — wherever you are
              on the continent.
            </p>
            <div className="hero-actions">
              <Link href="/register" className="btn-primary">Open an account</Link>
              <Link href="/login" className="btn-ghost">Log in</Link>
            </div>
          </div>

          <div className="rate-card">
            <div className="rate-card-title">Live exchange rates · Base USD</div>
            {heroPairs.map((code) => (
              <div className="rate-row" key={code}>
                <div>
                  <div className="rate-code">{code}</div>
                  <div className="rate-name">{LABELS[code]}</div>
                </div>
                <div className="rate-figure">
                  {rates && rates[code] != null
                    ? Number(rates[code]).toFixed(code === "JPY" ? 2 : 4)
                    : "…"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Everything your account needs</h2>
          <p>A straightforward set of tools for everyday banking and for the team keeping it running.</p>
        </div>
        <div className="grid-3">
          <div className="feature-card">
            <div className="feature-index">01</div>
            <h3>Personal dashboard</h3>
            <p>Check your balance, account number, and account status the moment you log in.</p>
          </div>
          <div className="feature-card">
            <div className="feature-index">02</div>
            <h3>Live currency rates</h3>
            <p>USD, GBP and Yen rates refresh automatically, alongside key African currencies.</p>
          </div>
          <div className="feature-card">
            <div className="feature-index">03</div>
            <h3>Admin controls</h3>
            <p>Bank staff can review every account, adjust balances, and manage account status.</p>
          </div>
        </div>
      </section>

      <div className="footer">© {new Date().getFullYear()} Unions Africa Bank. Built for learning and demonstration purposes.</div>
    </div>
  );
}
