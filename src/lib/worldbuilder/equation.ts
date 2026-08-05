// Spreadsheet-style formula engine for table cells.
// Supports: numbers, strings, booleans, column-name refs (row-based),
// cell refs (A1), ranges (A1:A10), + - * / ^ %, parentheses, comparisons,
// and functions SUM, AVERAGE, MIN, MAX, COUNT, ABS, SQRT, ROUND, FLOOR,
// CEIL, CLAMP, RAND, IF.

export type CellValue = string | number | boolean | undefined;

export interface GridContext {
  /** Column ids in display order. */
  colIds: string[];
  /** Normalized column names (lowercase, underscores) in display order. */
  colNames: string[];
  /** Raw rows keyed by column id. */
  rows: Record<string, string | number | boolean>[];
  /** Index of the row the formula lives in. */
  rowIndex: number;
}

type Value = number | string | boolean;

// ---------- tokenizer ----------
type Tok =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "id"; v: string }
  | { t: "op"; v: string };

function tokenize(src: string): Tok[] | undefined {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const n = Number(src.slice(i, j));
      if (isNaN(n)) return undefined;
      toks.push({ t: "num", v: n });
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let out = "";
      while (j < src.length && src[j] !== c) { out += src[j]; j++; }
      if (j >= src.length) return undefined;
      toks.push({ t: "str", v: out });
      i = j + 1;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      toks.push({ t: "id", v: src.slice(i, j) });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if ([">=", "<=", "==", "!=", "<>"].includes(two)) {
      toks.push({ t: "op", v: two === "<>" ? "!=" : two });
      i += 2;
      continue;
    }
    if ("+-*/^%()<>,:=".includes(c)) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    return undefined;
  }
  return toks;
}

// ---------- helpers ----------
function colLetterToIndex(s: string): number {
  let n = 0;
  for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function normName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

function toNum(v: Value | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    if (v.trim() === "") return 0;
    const n = Number(v);
    return isNaN(n) ? NaN : n;
  }
  return 0;
}

const CELL_RE = /^([A-Za-z]+)([0-9]+)$/;

class Evaluator {
  ctx: GridContext;
  stack: Set<string>;
  constructor(ctx: GridContext, stack: Set<string>) {
    this.ctx = ctx;
    this.stack = stack;
  }

  cell(colIdx: number, rowIdx: number): Value | undefined {
    const { colIds, rows } = this.ctx;
    if (colIdx < 0 || colIdx >= colIds.length || rowIdx < 0 || rowIdx >= rows.length) return undefined;
    const key = `${colIdx}:${rowIdx}`;
    if (this.stack.has(key)) return undefined; // cycle
    const raw = rows[rowIdx]?.[colIds[colIdx]];
    if (raw === undefined || raw === null || raw === "") return undefined;
    if (typeof raw === "string" && raw.startsWith("=")) {
      const next = new Set(this.stack);
      next.add(key);
      return evalFormula(raw.slice(1), { ...this.ctx, rowIndex: rowIdx }, next);
    }
    if (typeof raw === "string") {
      const n = Number(raw);
      return isNaN(n) ? raw : n;
    }
    return raw;
  }

  byName(name: string): Value | undefined {
    const idx = this.ctx.colNames.indexOf(normName(name));
    if (idx < 0) return undefined;
    return this.cell(idx, this.ctx.rowIndex);
  }
}

// ---------- parser ----------
function evalFormula(expr: string, ctx: GridContext, stack: Set<string>): Value | undefined {
  const toks = tokenize(expr);
  if (!toks || !toks.length) return undefined;
  const ev = new Evaluator(ctx, stack);
  let p = 0;
  let failed = false;
  const fail = () => { failed = true; return undefined; };
  const peek = () => toks[p];
  const eat = (v: string) => { const t = peek(); if (t && t.t === "op" && t.v === v) { p++; return true; } return false; };

  // returns Value | Value[] (ranges)
  function primary(): Value | Value[] | undefined {
    const t = peek();
    if (!t) return fail();
    if (t.t === "num") { p++; return t.v; }
    if (t.t === "str") { p++; return t.v; }
    if (t.t === "op" && t.v === "(") {
      p++;
      const v = comparison();
      if (!eat(")")) return fail();
      return v;
    }
    if (t.t === "op" && (t.v === "-" || t.v === "+")) {
      p++;
      const v = primary();
      const n = toNum(v as Value);
      if (isNaN(n)) return fail();
      return t.v === "-" ? -n : n;
    }
    if (t.t === "id") {
      p++;
      const name = t.v;
      // function call
      if (peek() && peek().t === "op" && (peek() as { v: string }).v === "(") {
        p++;
        const args: (Value | Value[])[] = [];
        if (!eat(")")) {
          for (;;) {
            const a = comparison();
            if (failed) return undefined;
            args.push(a as Value | Value[]);
            if (eat(",")) continue;
            if (eat(")")) break;
            return fail();
          }
        }
        return callFn(name.toUpperCase(), args);
      }
      const up = name.toUpperCase();
      if (up === "TRUE") return true;
      if (up === "FALSE") return false;
      const m = CELL_RE.exec(name);
      if (m) {
        const colIdx = colLetterToIndex(m[1]);
        const rowIdx = Number(m[2]) - 1;
        // range?
        if (peek() && peek().t === "op" && (peek() as { v: string }).v === ":") {
          const save = p;
          p++;
          const t2 = peek();
          if (t2 && t2.t === "id") {
            const m2 = CELL_RE.exec(t2.v);
            if (m2) {
              p++;
              const c2 = colLetterToIndex(m2[1]);
              const r2 = Number(m2[2]) - 1;
              const out: Value[] = [];
              for (let c = Math.min(colIdx, c2); c <= Math.max(colIdx, c2); c++) {
                for (let r = Math.min(rowIdx, r2); r <= Math.max(rowIdx, r2); r++) {
                  const v = ev.cell(c, r);
                  if (v !== undefined) out.push(v);
                }
              }
              return out;
            }
          }
          p = save;
        }
        const v = ev.cell(colIdx, rowIdx);
        return v === undefined ? 0 : v;
      }
      const v = ev.byName(name);
      if (v === undefined) return fail();
      return v;
    }
    return fail();
  }

  function power(): Value | Value[] | undefined {
    let left = primary();
    if (failed) return undefined;
    while (peek() && peek().t === "op" && (peek() as { v: string }).v === "^") {
      p++;
      const right = primary();
      if (failed) return undefined;
      left = Math.pow(toNum(left as Value), toNum(right as Value));
    }
    return left;
  }

  function term(): Value | Value[] | undefined {
    let left = power();
    if (failed) return undefined;
    for (;;) {
      const t = peek();
      if (!t || t.t !== "op" || !["*", "/", "%"].includes(t.v)) break;
      p++;
      const right = power();
      if (failed) return undefined;
      const a = toNum(left as Value), b = toNum(right as Value);
      if (isNaN(a) || isNaN(b)) return fail();
      left = t.v === "*" ? a * b : t.v === "/" ? (b === 0 ? fail() : a / b) : (b === 0 ? fail() : a % b);
      if (failed) return undefined;
    }
    return left;
  }

  function additive(): Value | Value[] | undefined {
    let left = term();
    if (failed) return undefined;
    for (;;) {
      const t = peek();
      if (!t || t.t !== "op" || (t.v !== "+" && t.v !== "-")) break;
      p++;
      const right = term();
      if (failed) return undefined;
      if (t.v === "+" && (typeof left === "string" || typeof right === "string")) {
        left = String(left) + String(right);
        continue;
      }
      const a = toNum(left as Value), b = toNum(right as Value);
      if (isNaN(a) || isNaN(b)) return fail();
      left = t.v === "+" ? a + b : a - b;
    }
    return left;
  }

  function comparison(): Value | Value[] | undefined {
    const left = additive();
    if (failed) return undefined;
    const t = peek();
    if (t && t.t === "op" && [">", "<", ">=", "<=", "==", "!=", "="].includes(t.v)) {
      const op = t.v === "=" ? "==" : t.v;
      p++;
      const right = additive();
      if (failed) return undefined;
      const l = left as Value, r = right as Value;
      if (typeof l === "string" || typeof r === "string") {
        const ls = String(l), rs = String(r);
        switch (op) {
          case "==": return ls === rs;
          case "!=": return ls !== rs;
          case ">": return ls > rs;
          case "<": return ls < rs;
          case ">=": return ls >= rs;
          default: return ls <= rs;
        }
      }
      const a = toNum(l), b = toNum(r);
      switch (op) {
        case "==": return a === b;
        case "!=": return a !== b;
        case ">": return a > b;
        case "<": return a < b;
        case ">=": return a >= b;
        default: return a <= b;
      }
    }
    return left;
  }

  function flat(args: (Value | Value[])[]): Value[] {
    const out: Value[] = [];
    for (const a of args) Array.isArray(a) ? out.push(...a) : out.push(a);
    return out;
  }
  function nums(args: (Value | Value[])[]): number[] {
    return flat(args).map(toNum).filter((n) => !isNaN(n));
  }

  function callFn(name: string, args: (Value | Value[])[]): Value | undefined {
    const n = nums(args);
    switch (name) {
      case "SUM": return n.reduce((a, b) => a + b, 0);
      case "AVERAGE": return n.length ? n.reduce((a, b) => a + b, 0) / n.length : fail();
      case "MIN": return n.length ? Math.min(...n) : fail();
      case "MAX": return n.length ? Math.max(...n) : fail();
      case "COUNT": return n.length;
      case "ABS": return n.length ? Math.abs(n[0]) : fail();
      case "SQRT": return n.length && n[0] >= 0 ? Math.sqrt(n[0]) : fail();
      case "ROUND": {
        if (!n.length) return fail();
        const d = n.length > 1 ? Math.trunc(n[1]) : 0;
        const f = Math.pow(10, d);
        return Math.round(n[0] * f) / f;
      }
      case "FLOOR": return n.length ? Math.floor(n[0]) : fail();
      case "CEIL":
      case "CEILING": return n.length ? Math.ceil(n[0]) : fail();
      case "CLAMP": return n.length >= 3 ? Math.min(Math.max(n[0], n[1]), n[2]) : fail();
      case "RAND": {
        if (n.length >= 2) return Math.floor(Math.random() * (n[1] - n[0] + 1)) + n[0];
        return Math.random();
      }
      case "IF": {
        const flatArgs = args.map((a) => (Array.isArray(a) ? a[0] : a));
        if (flatArgs.length < 2) return fail();
        const cond = flatArgs[0];
        const truthy = typeof cond === "boolean" ? cond : typeof cond === "string" ? cond !== "" : toNum(cond) !== 0;
        const chosen = truthy ? flatArgs[1] : flatArgs.length > 2 ? flatArgs[2] : "";
        return chosen === undefined ? "" : (chosen as Value);
      }
      default: return fail();
    }
  }

  const result = comparison();
  if (failed || p !== toks.length) return undefined;
  if (Array.isArray(result)) return result.length ? result[0] : undefined;
  if (typeof result === "number" && !isFinite(result)) return undefined;
  return result;
}

/** Evaluate a cell formula (without the leading "="). */
export function evalCell(expr: string, ctx: GridContext): Value | undefined {
  return evalFormula(expr, ctx, new Set());
}

/** Legacy helper: evaluate with a simple name->number map. */
export function evalCellEquation(expr: string, vars: Record<string, number>): number | undefined {
  const names = Object.keys(vars);
  const ctx: GridContext = {
    colIds: names,
    colNames: names,
    rows: [Object.fromEntries(names.map((k) => [k, vars[k]]))],
    rowIndex: 0,
  };
  const r = evalFormula(expr, ctx, new Set());
  return typeof r === "number" ? r : undefined;
}
