import { useEffect, useState } from "react";

const LABELS = {
  USD: "US Dollar",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  EUR: "Euro",
  NGN: "Nigerian Naira",
  ZAR: "South African Rand",
  KES: "Kenyan Shilling",
  GHS: "Ghanaian Cedi",
};

export function useRates(pollMs = 60000) {
  const [rates, setRates] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/rates");
        const data = await res.json();
        if (!active) return;
        if (!res.ok) throw new Error(data.error || "Failed to load rates");
        setRates(data.rates);
        setUpdatedAt(data.updatedAt);
        setError(null);
      } catch (err) {
        if (active) setError(err.message);
      }
    }

    load();
    const id = setInterval(load, pollMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [pollMs]);

  return { rates, updatedAt, error };
}

export default function RateTicker() {
  const { rates, updatedAt, error } = useRates();

  if (error) {
    return (
      <div className="ticker">
        <div className="ticker-updated">Live rates are temporarily unavailable.</div>
      </div>
    );
  }

  if (!rates) {
    return (
      <div className="ticker">
        <div className="ticker-updated">Loading live exchange rates…</div>
      </div>
    );
  }

  const pairs = ["USD", "GBP", "JPY", "EUR", "NGN", "ZAR"].filter((c) => rates[c] != null);
  const items = pairs.map((code) => (
    <span className="ticker-item" key={code}>
      <span className="ticker-pair">1 USD → {code}</span>
      <span className="ticker-value">
        {code === "USD" ? "1.0000" : Number(rates[code]).toFixed(code === "JPY" ? 2 : 4)}
      </span>
    </span>
  ));

  return (
    <div className="ticker">
      <div className="ticker-track">
        {items}
        {items /* duplicated for seamless loop */}
      </div>
    </div>
  );
}

export { LABELS };
