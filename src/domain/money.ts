const MICROS_PER_UNIT = 1_000_000n;
const MAX_AMOUNT_MICROS = 999_999_999_999_999n;

export function parseAmount(value: string): bigint {
  const parts = /^([+-]?)(\d{1,9})(?:[.,](\d{1,6}))?$/.exec(value.trim());
  if (!parts) throw new Error("amount");
  const [, sign, whole, fraction = ""] = parts;
  const magnitude = BigInt(whole) * MICROS_PER_UNIT + BigInt(fraction.padEnd(6, "0"));
  if (magnitude > MAX_AMOUNT_MICROS) throw new Error("amount");
  return sign === "-" ? -magnitude : magnitude;
}

export function decimalAmount(units: bigint): string {
  const magnitude = units < 0n ? -units : units;
  const whole = magnitude / MICROS_PER_UNIT;
  const fraction = (magnitude % MICROS_PER_UNIT).toString().padStart(6, "0").replace(/0+$/, "");
  return (units < 0n ? "-" : "") + whole + (fraction ? "." + fraction : "");
}

export function formatIls(units: bigint, locale: string): string {
  const magnitude = units < 0n ? -units : units;
  const cents = (magnitude + 5_000n) / 10_000n;
  const whole = cents / 100n;
  const signedWhole = units < 0n && cents > 0n ? (whole === 0n ? -0 : -whole) : whole;
  const display = new Intl.NumberFormat(locale, { style: "currency", currency: "ILS" });
  const digits = new Intl.NumberFormat(locale, { useGrouping: false, minimumIntegerDigits: 2 });
  return display.formatToParts(signedWhole).map((part) =>
    part.type === "fraction" ? digits.format(cents % 100n) : part.value
  ).join("");
}
