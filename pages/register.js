import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../components/Navbar";

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", adminCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed.");
      router.push(data.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Navbar user={null} onLogout={() => {}} />
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Open your account</h1>
          <p className="auth-sub">It takes less than a minute to get started.</p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                required
                value={form.fullName}
                onChange={update("fullName")}
                placeholder="e.g. Amara Chukwu"
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={update("email")}
                placeholder="you@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={update("password")}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="field">
              <label htmlFor="adminCode">Admin code (optional)</label>
              <input
                id="adminCode"
                value={form.adminCode}
                onChange={update("adminCode")}
                placeholder="Leave blank for a personal account"
              />
              <div className="field-hint">Only bank staff should have this code.</div>
            </div>

            <button className="btn-block" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="auth-foot">
            Already have an account? <Link href="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
