# Unions Africa Bank

A demo full-stack bank website built with **Next.js** (frontend + API routes), **MongoDB/Mongoose**, and **JWT** auth in an HTTP-only cookie. White & dark navy brand identity, live USD/GBP/JPY (plus a few African currencies) exchange rates, user registration/login, a personal dashboard, and an admin dashboard for managing accounts.

## Features

- **Register / Login** — email + password, passwords hashed with bcrypt, session stored as a signed JWT in an HTTP-only cookie (no client-side token handling needed).
- **User dashboard** — passport photo upload, balance (viewable in USD, GBP, JPY, NGN, EUR, or ZAR), account number, status, live FX table, **withdrawals**, and a transaction history with receipt-style messages.
- **Withdrawals** — a "Withdraw funds" modal: enter a receiving account number and amount → confirm with a transaction PIN (set on first use, verified on every use after) → processing spinner → success screen. Balance is deducted immediately and an email receipt is sent.
- **Admin dashboard** — list every account, **fund an account** in any supported currency with a sender name, generating a receipt line like `Deposit successful from Chibuzor David Christian To Chinaza Michael Okpara | Amount ₦500,000.00`, and suspend/activate accounts. Anyone who registers with the correct `ADMIN_SIGNUP_CODE` becomes an admin.
- **Email receipts** — both deposits and withdrawals send a confirmation email via SMTP if configured (see `.env.example`); otherwise the app logs it and continues without blocking the transaction.
- **Live rates** — `/api/rates` proxies a free, keyless FX API (`open.er-api.com`) so the browser never calls a third party directly. A scrolling ticker and rate cards show USD, GBP, JPY, EUR, NGN, ZAR, KES, GHS.

## Testing the deposit flow end-to-end

1. Register a normal account (leave the admin code blank) — note the **account number** shown on the dashboard.
2. Register a second account **with** the `ADMIN_SIGNUP_CODE` you set in `.env.local` — this logs you in as admin.
3. In the admin dashboard, click **Fund account** on the customer's row. The "From" field is pre-filled with your own name (editable), then enter an amount and pick a currency (defaults to NGN) — a live preview of the receipt line appears as you type.
4. Confirm the deposit. The entered amount is converted to USD (the account's base currency) using the live rate at that moment, and the customer's balance updates immediately.
5. Log back in as the customer — the deposit appears in **Transaction history** with the full formatted message (e.g. `Deposit successful from Chibuzor David Christian To Chinaza Michael Okpara | Amount ₦500,000.00`).
6. Use the currency dropdown next to "Account balance" to switch between USD, GBP, JPY, NGN, EUR, and ZAR — this is a live-converted display of the same underlying USD balance.
7. On the same dashboard, upload a **passport photo** (JPG/PNG, under ~1MB) — it's stored on the account and shown in a small photo box, with options to change or remove it.

## Testing the withdrawal flow end-to-end

1. As the logged-in customer, click **Withdraw funds** on the dashboard.
2. Enter a **receiving account number** (any string — this demo doesn't validate it against another bank) and an **amount** (e.g. `40000`), pick a currency, then click **Send**.
3. You'll be asked for a **transaction PIN**. The first time, you're setting one (enter it twice); after that, you just enter your existing PIN.
4. A **Processing…** spinner shows while the request is in flight, then a **Successful** screen confirms the withdrawal and shows the new balance.
5. The balance on the dashboard updates immediately, and the withdrawal appears in **Transaction history** as a red, debited line (e.g. `Withdrawal successful from Chinaza Michael Okpara To Account 9988776655 | Amount $40,000.00`).
6. If `SMTP_HOST` is configured in `.env.local`, a confirmation email is sent to the account holder's email address; otherwise the success screen tells you email wasn't sent because SMTP isn't configured, and the withdrawal still completes normally.

Balances are always stored in USD under the hood; deposits, withdrawals, and the currency switcher are conversions on top of that, the same way a real multi-currency account statement works.

## Project structure

```
union-africa-bank/
  lib/            # db connection, JWT/cookie auth helpers
  models/         # Mongoose User model
  pages/          # Next.js pages (UI) + pages/api (backend routes)
  components/     # Navbar, RateTicker
  styles/         # global stylesheet (navy & white theme)
```

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI, JWT_SECRET, ADMIN_SIGNUP_CODE
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Your MongoDB connection string (MongoDB Atlas free tier works fine, or Railway's MongoDB plugin). |
| `JWT_SECRET` | Long random string used to sign login tokens. |
| `ADMIN_SIGNUP_CODE` | Whoever enters this code on the register page gets `role: admin`. Keep it private, share only with staff. |

## Deploying on Railway (matches your usual GitHub → Railway flow)

1. Push this folder to a new GitHub repo.
2. In Railway: **New Project → Deploy from GitHub repo**.
3. Add a MongoDB database from Railway's plugin marketplace (or paste an Atlas URI).
4. In the Next.js service's **Variables** tab, add `MONGODB_URI`, `JWT_SECRET`, `ADMIN_SIGNUP_CODE`.
5. Railway auto-detects Next.js and runs `npm run build` / `npm run start`. No extra config needed.

## Notes / next steps you may want to add

- Real money movement (transfers, deposits) is out of scope here — this is a registration/auth/admin + live-rates scaffold to build on.
- Add rate limiting to `/api/auth/login` before this goes anywhere near production.
- Add email verification if you want to confirm real email ownership.
- The admin signup code is a simple approach for a learning project — for production, promote users to admin manually in the database instead of via a public code field.
