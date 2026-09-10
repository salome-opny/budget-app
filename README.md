# Budget

A personal income and expense tracker, built as an installable web app for iPhone.

**Your data never leaves the device.** There is no backend, no account and no sync.
Everything is stored in the browser's IndexedDB, which means backups are your
responsibility — see [Backups](#backups) below.

## What it does

| Screen | What you get |
| --- | --- |
| **Summary** | Income, expenses and net for a period, how each group is tracking against its monthly limit, and breakdowns by group and category |
| **Expenses** | One tab per group (Personal / Business by default), filterable by category |
| **Income** | Same, for money coming in |
| **Trends** | Income vs expenses per month, net per month, and a side-by-side comparison of any two months |
| **Settings** | Groups, categories, currency, exchange rate, backup and restore |

**Groups** are the "separate pages" — each one gets its own tab, and the Summary
adds them all up. Two ship by default; add, rename or remove them in Settings.

**Monthly limits and goals.** Any expense group can carry two numbers, both set
in Settings: a *limit*, the most you allow yourself in a month, and a *goal*,
what you actually aim to spend — normally lower. Summary and the Expenses tab
show how much is gone, what is left to the goal and to the limit, and how many
days remain in the month.

- The bar is green while you are within the goal, amber once you pass the goal
  or reach 80% of the limit, and red once the limit is blown. Passing the goal is
  deliberately only amber: the goal is what you hope for, the limit is what you
  can afford.
- A tall marker on the bar shows the goal. A thin tick shows where you would be
  if you spent evenly through the month, so "faster than the month" means you are
  outrunning your goal even while still under it.
- Either number works on its own. With only a goal, the bar measures against it.

Both numbers share one currency per group, stored like an entry's currency, so
switching your main currency reprices them instead of silently changing what they
mean. Clearing a field removes it. There are no push notifications: with no server
there is nothing to send them, so everything is shown in the app instead.

**Categories** are the "type" you filter and total by. Expenses and income have
their own separate lists.

**Currencies.** Every entry keeps the currency you actually paid in (USD or COP);
new entries start in your main currency, which is COP by default. Totals are
converted into the main currency using a rate you control in Settings — nothing
is fetched from the internet. Amount input is
currency-aware: typing `1.250.000` under COP means 1,250,000 pesos, while `1.250`
under USD means one dollar twenty-five.

## Backups

Because there is no server, a backup is the only copy of your data that survives
clearing Safari's storage or changing phones.

- **Export backup** — writes a `.json` file. On iPhone this opens the share sheet,
  so you can drop it into Files, iCloud Drive or WhatsApp.
- **Copy as text** — puts the same JSON on the clipboard, for when the share sheet
  is not cooperating.
- **Restore from file** — replaces everything currently in the app with the file's
  contents. It validates the file before touching your data, so a wrong file
  leaves the app untouched.

## Installing it on an iPhone

1. Open <https://salome-opny.github.io/budget-app/> in **Safari** (it must be
   Safari — Chrome on iOS cannot install web apps).
2. Tap the share button, then **Add to Home Screen**.
3. It gets its own icon and opens full-screen, with no browser chrome.

Once installed it should work offline: a service worker caches the app shell, and
the data was always local anyway. If registration fails for any reason the app
still works — it just needs the network to load.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and
publishes to GitHub Pages.

The site is served from a subfolder (`/budget-app`), not a domain root, so every
absolute URL has to carry that prefix. It comes from `NEXT_PUBLIC_BASE_PATH`,
set in the workflow and read by both `next.config.ts` and `src/lib/basePath.ts`.
It is empty locally, so `npm run dev` still serves from `/`.

**If the repo is ever renamed, change `NEXT_PUBLIC_BASE_PATH` in the workflow to
match** — otherwise the deployed page loads with no styles or scripts.

## Running it locally

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build and type check |
| `npm test` | Unit tests (money parsing, conversion, aggregation, dates) |
| `npm run lint` | ESLint |

## How it is built

- **Next.js 16** (App Router) with **Tailwind CSS 4** — every page is a client
  component, since all the data lives in the browser.
- **Dexie** over IndexedDB, with `useLiveQuery` so every screen re-renders when
  an entry changes.
- **Recharts** for the two charts on Trends.
- No auth, no API routes, no database server.

### Where things live

| Path | Contents |
| --- | --- |
| `src/lib/db.ts` | Dexie schema and the first-run seed data |
| `src/lib/types.ts` | The four record types: `Group`, `Category`, `Txn`, `Settings` |
| `src/lib/money.ts` | Currency conversion, formatting, and the amount parser |
| `src/lib/aggregate.ts` | Filtering and totalling — the whole reporting layer |
| `src/lib/dates.ts` | Month keys, period ranges, labels |
| `src/lib/mutations.ts` | Every write, including backup and restore |
| `src/components/` | UI, including the shared `LedgerPage` behind Expenses and Income |

Tests cover the parts where a silent mistake would misreport money:
`src/lib/money.test.ts` and `src/lib/aggregate.test.ts`.
