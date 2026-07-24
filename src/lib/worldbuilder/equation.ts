// Safe arithmetic evaluator for table cell equations.
// Supports: numbers, identifiers (resolved from vars map), + - * / ( ) and unary minus.
// Returns undefined on any parse/eval failure or unresolved identifier.
export function evalCellEquation(expr: string, vars: Record<string, number>): number | undefined {
  const src = expr.trim();
  if (!src) return undefined;
  // Whitelist characters (letters, digits, underscore, math ops, dot, parens, whitespace).
  if (!/^[a-zA-Z0-9_ .+\-*/()]+$/.test(src)) return undefined;
  // Replace identifiers with numeric literals.
  let unresolved = false;
  const replaced = src.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (id) => {
    const key = id.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(vars, key)) return `(${vars[key]})`;
    unresolved = true;
    return "0";
  });
  if (unresolved) return undefined;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${replaced});`) as () => unknown;
    const r = fn();
    return typeof r === "number" && isFinite(r) ? r : undefined;
  } catch {
    return undefined;
  }
}