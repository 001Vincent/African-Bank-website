import { fetchUsdRates } from "../../lib/rates";

export default async function handler(req, res) {
  try {
    const { rates, updatedAt } = await fetchUsdRates();

    // USD -> X rates from the provider. We invert USD/GBP and USD/JPY are already
    // "how many of X per 1 USD", which is the natural way to display FX on a bank site.
    const highlights = {
      USD: 1,
      GBP: rates.GBP,
      JPY: rates.JPY,
      EUR: rates.EUR,
      NGN: rates.NGN,
      ZAR: rates.ZAR,
      KES: rates.KES,
      GHS: rates.GHS,
    };

    return res.status(200).json({ base: "USD", updatedAt, rates: highlights });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "Unable to fetch live rates right now." });
  }
}
