import Link from "next/link";
import { useRouter } from "next/router";

export default function Navbar({ user, onLogout }) {
  const router = useRouter();

  return (
    <div className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">UA</span>
          Unions Africa Bank
        </Link>
        <div className="nav-links">
          {!user && (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/register" className="btn-outline-light">
                Open an account
              </Link>
            </>
          )}
          {user && user.role !== "admin" && (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <button onClick={onLogout}>Log out</button>
            </>
          )}
          {user && user.role === "admin" && (
            <>
              <Link href="/admin">Admin</Link>
              <button onClick={onLogout}>Log out</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
