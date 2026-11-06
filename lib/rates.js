const RATES_URL = "https://open.er-api.com/v6/latest/USD";

// Returns { USD: 1, GBP: x, JPY: x, ... } — units per 1 USD.
export async function fetchUsdRates() {
  const response = await fetch(RATES_URL);
  if (!response.ok) throw new Error("Upstream rates service error");
  const data = await response.json();
  if (data.result !== "success") throw new Error("Rates provider returned an error");
  return { rates: data.rates || {}, updatedAt: data.time_last_update_utc || new Date().toUTCString() };
}
