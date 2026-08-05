// Spreadsheet-style column names: A, B, ... Z, AA, AB, ... infinitely.
export function columnLabel(index: number): string {
  let n = index;
  let out = "";
  while (n >= 0) {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  }
  return out;
}

// Next available label given existing column names (skips ones already used).
export function nextColumnLabel(existing: { name: string }[]): string {
  const used = new Set(existing.map((c) => c.name.trim().toUpperCase()));
  for (let i = 0; ; i++) {
    const label = columnLabel(i);
    if (!used.has(label)) return label;
  }
}
