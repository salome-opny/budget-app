import type { Currency, Settings, Txn } from "./types";

/** Convert an amount into the user's primary currency. */
export function toPrimary(
  amount: number,
  from: Currency,
  settings: Pick<Settings, "primaryCurrency" | "copPerUsd">
): number {
  const { primaryCurrency, copPerUsd } = settings;
  if (from === primaryCurrency) return amount;
  if (!copPerUsd || copPerUsd <= 0) return from === "USD" ? amount : 0;
  return from === "USD" ? amount * copPerUsd : amount / copPerUsd;
}

export function txnInPrimary(
  txn: Pick<Txn, "amount" | "currency">,
  settings: Pick<Settings, "primaryCurrency" | "copPerUsd">
): number {
  return toPrimary(txn.amount, txn.currency, settings);
}

const FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }),
  COP: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }),
};

export function formatMoney(amount: number, currency: Currency): string {
  return FORMATTERS[currency].format(amount);
}

const WHOLE: Record<Currency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }),
  COP: FORMATTERS.COP,
};

/** No cents. For dense tables where three numbers share one row. */
export function formatMoneyWhole(amount: number, currency: Currency): string {
  return WHOLE[currency].format(amount);
}

/**
 * Short form for dense rows like the budget meters, where full peso figures
 * ("COP 15,340,000 / COP 20,000,000") crowd the group name out on a phone.
 * Under 100,000 it is exactly formatMoney; above that it rounds to k or M.
 */
export function formatMoneyShort(amount: number, currency: Currency): string {
  const n = Math.abs(amount);
  if (n < 100_000) return formatMoney(amount, currency);
  const sign = amount < 0 ? "-" : "";
  const prefix = currency === "USD" ? "$" : "COP\u00a0";
  // "15.30" -> "15.3", "20.0" -> "20"
  const trim = (x: string) => x.replace(/\.0+$|(\.\d*[1-9])0+$/, "$1");
  // Start using M just below a million, so 999,600 never renders as "1000k".
  const body =
    n >= 999_500
      ? `${trim((n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2))}M`
      : `${Math.round(n / 1_000)}k`;
  return `${sign}${prefix}${body}`;
}

/** Compact form for tight spots like chart axes: $1.2k, $340. */
export function formatCompact(amount: number, currency: Currency): string {
  const sign = amount < 0 ? "-" : "";
  const n = Math.abs(amount);
  const symbol = currency === "USD" ? "$" : "$";
  if (n >= 1_000_000) return `${sign}${symbol}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${sign}${symbol}${(n / 1_000).toFixed(1)}k`;
  return `${sign}${symbol}${Math.round(n)}`;
}

/**
 * Parse loose user input into a number.
 *
 * Separators are genuinely ambiguous across the two currencies this app holds:
 * "1.250" is $1.25 to a US keyboard and 1,250 pesos to a Colombian one. Rather
 * than guess, we branch on the currency the entry is being recorded in. COP has
 * no practical sub-unit, so every separator in a peso amount is a thousands mark.
 */
export function parseAmount(raw: string, currency: Currency = "USD"): number | null {
  const cleaned = raw.replace(/[^0-9.,]/g, "").trim();
  if (!cleaned) return null;

  let normalized: string;

  if (currency === "COP") {
    normalized = cleaned.replace(/[.,]/g, "");
  } else {
    const dots = (cleaned.match(/\./g) ?? []).length;
    const commas = (cleaned.match(/,/g) ?? []).length;
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");

    if (dots > 0 && commas > 0) {
      // Whichever appears last is the decimal separator.
      normalized =
        lastComma > lastDot
          ? cleaned.replace(/\./g, "").replace(",", ".")
          : cleaned.replace(/,/g, "");
    } else if (dots > 1) {
      normalized = cleaned.replace(/\./g, "");
    } else if (commas > 1) {
      normalized = cleaned.replace(/,/g, "");
    } else if (commas === 1) {
      // A lone comma is a decimal point unless it sits in a thousands slot.
      const decimals = cleaned.length - lastComma - 1;
      normalized = decimals === 3 ? cleaned.replace(",", "") : cleaned.replace(",", ".");
    } else {
      normalized = cleaned;
    }
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}
