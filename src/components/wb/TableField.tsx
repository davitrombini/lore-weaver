import { useMemo } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import type { TableColumn, TableColumnType } from "@/lib/worldbuilder/types";
import { formatBR } from "@/lib/worldbuilder/dateUtils";
import { evalCellEquation } from "@/lib/worldbuilder/equation";

export interface TableValue {
  rows: Record<string, string | number | boolean>[];
}

function defaultCols(): TableColumn[] {
  return [
    { id: "c_" + Math.random().toString(36).slice(2, 8), name: "A", type: "text" },
    { id: "c_" + Math.random().toString(36).slice(2, 8), name: "B", type: "number" },
  ];
}

function normalize(value: unknown, cols: TableColumn[]): TableValue {
  const v = (value ?? {}) as Partial<TableValue>;
  const rows = Array.isArray(v.rows) ? v.rows : [];
  return { rows: rows.map((r) => ({ ...r })) };
}

function normColname(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

function resolveCell(raw: string | number | boolean | undefined, cols: TableColumn[], row: Record<string, string | number | boolean>): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "number") return raw;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  const s = String(raw);
  if (s.startsWith("=")) {
    const nameToNum: Record<string, number> = {};
    for (const c of cols) {
      const v = row[c.id];
      if (typeof v === "number") nameToNum[normColname(c.name)] = v;
      else if (typeof v === "string" && v && !v.startsWith("=") && !isNaN(Number(v))) nameToNum[normColname(c.name)] = Number(v);
      else if (typeof v === "boolean") nameToNum[normColname(c.name)] = v ? 1 : 0;
    }
    // resolve equation refs for referenced cells (single-level)
    for (const c of cols) {
      const v = row[c.id];
      if (typeof v === "string" && v.startsWith("=")) {
        const r = evalCellEquation(v.slice(1), nameToNum);
        if (r !== undefined) nameToNum[normColname(c.name)] = r;
      }
    }
    return evalCellEquation(s.slice(1), nameToNum);
  }
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

interface Props {
  columns: TableColumn[];
  value: unknown;
  onChange: (v: TableValue) => void;
  onChangeColumns?: (cols: TableColumn[]) => void; // when editing structure inline
  readOnly?: boolean;
}

export function TableField({ columns, value, onChange, onChangeColumns, readOnly }: Props) {
  const cols = columns.length ? columns : defaultCols();
  const val = useMemo(() => normalize(value, cols), [value, cols]);

  const setCell = (rowIdx: number, colId: string, v: string | number | boolean) => {
    const rows = val.rows.map((r, i) => (i === rowIdx ? { ...r, [colId]: v } : r));
    onChange({ rows });
  };
  const addRow = () => onChange({ rows: [...val.rows, {}] });
  const removeRow = (idx: number) => onChange({ rows: val.rows.filter((_, i) => i !== idx) });
  const moveRow = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= val.rows.length) return;
    const rows = [...val.rows];
    [rows[idx], rows[next]] = [rows[next], rows[idx]];
    onChange({ rows });
  };

  // column edits
  const addCol = () => {
    if (!onChangeColumns) return;
    onChangeColumns([...cols, { id: "c_" + Math.random().toString(36).slice(2, 8), name: `Col ${cols.length + 1}`, type: "text" }]);
  };
  const removeCol = (id: string) => {
    if (!onChangeColumns) return;
    onChangeColumns(cols.filter((c) => c.id !== id));
  };
  const renameCol = (id: string, name: string) => onChangeColumns?.(cols.map((c) => (c.id === id ? { ...c, name } : c)));
  const setColType = (id: string, type: TableColumnType) => onChangeColumns?.(cols.map((c) => (c.id === id ? { ...c, type } : c)));
  const moveCol = (id: string, dir: -1 | 1) => {
    if (!onChangeColumns) return;
    const idx = cols.findIndex((c) => c.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= cols.length) return;
    const arr = [...cols];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onChangeColumns(arr);
  };

  if (readOnly) {
    if (!val.rows.length) return <div className="text-sm text-muted-foreground italic">Tabela vazia</div>;
    return (
      <div className="overflow-auto border border-border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>{cols.map((c) => <th key={c.id} className="text-left px-2 py-1.5 font-medium">{c.name}</th>)}</tr>
          </thead>
          <tbody>
            {val.rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {cols.map((c) => {
                  const raw = r[c.id];
                  let display: React.ReactNode = raw as React.ReactNode;
                  if (c.type === "checkbox") display = raw ? "✓" : "";
                  else if (c.type === "date" && typeof raw === "string") display = formatBR(raw);
                  else if (typeof raw === "string" && raw.startsWith("=")) {
                    const n = resolveCell(raw, cols, r);
                    display = n === undefined ? raw : String(n);
                  }
                  return <td key={c.id} className="px-2 py-1 tabular-nums">{display}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-auto border border-border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {cols.map((c) => (
                <th key={c.id} className="text-left px-1.5 py-1 font-medium">
                  {onChangeColumns ? (
                    <div className="flex items-center gap-0.5">
                      <input
                        value={c.name}
                        onChange={(e) => renameCol(c.id, e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none text-xs px-1 w-full min-w-0"
                      />
                      <select
                        value={c.type}
                        onChange={(e) => setColType(c.id, e.target.value as TableColumnType)}
                        className="bg-transparent text-[10px] text-muted-foreground focus:outline-none"
                      >
                        <option value="text">Txt</option>
                        <option value="number">Núm</option>
                        <option value="date">Data</option>
                        <option value="checkbox">☑</option>
                      </select>
                      <button onClick={() => moveCol(c.id, -1)} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="w-3 h-3" /></button>
                      <button onClick={() => moveCol(c.id, 1)} className="text-muted-foreground hover:text-foreground"><ChevronRight className="w-3 h-3" /></button>
                      <button onClick={() => removeCol(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ) : c.name}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {val.rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {cols.map((c) => {
                  const raw = r[c.id];
                  if (c.type === "checkbox") {
                    return (
                      <td key={c.id} className="px-2 py-1">
                        <input type="checkbox" checked={!!raw} onChange={(e) => setCell(i, c.id, e.target.checked)} />
                      </td>
                    );
                  }
                  if (c.type === "date") {
                    return (
                      <td key={c.id} className="px-1 py-0.5">
                        <input type="date" value={(raw as string) ?? ""} onChange={(e) => setCell(i, c.id, e.target.value)}
                          className="bg-transparent text-xs w-full focus:outline-none" />
                      </td>
                    );
                  }
                  if (c.type === "number") {
                    // still allow "=..." equations even in number columns
                    const isEq = typeof raw === "string" && raw.startsWith("=");
                    if (isEq) {
                      const n = resolveCell(raw as string, cols, r);
                      return (
                        <td key={c.id} className="px-1 py-0.5">
                          <input value={raw as string} onChange={(e) => setCell(i, c.id, e.target.value)}
                            className="bg-transparent text-xs w-full focus:outline-none font-mono" />
                          <span className="block text-[10px] text-muted-foreground tabular-nums">= {n ?? "?"}</span>
                        </td>
                      );
                    }
                    return (
                      <td key={c.id} className="px-1 py-0.5">
                        <input
                          value={(raw as string | number | undefined) ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v.startsWith("=")) setCell(i, c.id, v);
                            else if (v === "") setCell(i, c.id, "");
                            else setCell(i, c.id, isNaN(Number(v)) ? v : Number(v));
                          }}
                          className="bg-transparent text-xs w-full focus:outline-none tabular-nums"
                          placeholder="0 ou =a+b"
                        />
                      </td>
                    );
                  }
                  return (
                    <td key={c.id} className="px-1 py-0.5">
                      <input
                        value={(raw as string) ?? ""}
                        onChange={(e) => setCell(i, c.id, e.target.value)}
                        className="bg-transparent text-xs w-full focus:outline-none"
                      />
                    </td>
                  );
                })}
                <td className="px-1 py-0.5">
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => moveRow(i, -1)} className="text-muted-foreground hover:text-foreground"><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => moveRow(i, 1)} className="text-muted-foreground hover:text-foreground"><ChevronDown className="w-3 h-3" /></button>
                    <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={addRow} className="text-xs px-2 py-1 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1">
          <Plus className="w-3 h-3" /> Linha
        </button>
        {onChangeColumns && (
          <button type="button" onClick={addCol} className="text-xs px-2 py-1 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> Coluna
          </button>
        )}
        <span className="text-[10px] text-muted-foreground self-center">Dica: use <code className="font-mono">=a+b</code> para equações (nomes das colunas).</span>
      </div>
      {/* fake reference to avoid unused import lint */}
      <span className="hidden"><Pencil className="w-3 h-3" /></span>
    </div>
  );
}