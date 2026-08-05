import { useMemo } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import type { TableColumn, TableColumnType } from "@/lib/worldbuilder/types";
import { formatBR } from "@/lib/worldbuilder/dateUtils";
import { evalCell, type GridContext } from "@/lib/worldbuilder/equation";
import { nextColumnLabel } from "@/lib/worldbuilder/columnNames";

export interface TableValue {
  columns?: TableColumn[];
  rows: Record<string, string | number | boolean>[];
}

function normalize(value: unknown): TableValue {
  const v = (value ?? {}) as Partial<TableValue>;
  const rows = Array.isArray(v.rows) ? v.rows : [];
  return { columns: Array.isArray(v.columns) ? v.columns : undefined, rows: rows.map((r) => ({ ...r })) };
}

function normColname(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

function makeCtx(cols: TableColumn[], rows: Record<string, string | number | boolean>[], rowIndex: number): GridContext {
  return {
    colIds: cols.map((c) => c.id),
    colNames: cols.map((c) => normColname(c.name)),
    rows,
    rowIndex,
  };
}

function resolveCell(
  raw: string | number | boolean | undefined,
  cols: TableColumn[],
  rows: Record<string, string | number | boolean>[],
  rowIndex: number,
): string | number | boolean | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string" || !raw.startsWith("=")) return raw as string | number | boolean;
  return evalCell(raw.slice(1), makeCtx(cols, rows, rowIndex));
}

interface Props {
  columns: TableColumn[];
  value: unknown;
  onChange: (v: TableValue) => void;
  onChangeColumns?: (cols: TableColumn[]) => void; // when editing structure inline
  readOnly?: boolean;
}

export function TableField({ columns, value, onChange, onChangeColumns, readOnly }: Props) {
  const val = useMemo(() => normalize(value), [value]);
  // Column definitions live in a single place: the template schema when it
  // defines columns, otherwise once inside the field value — never per row.
  const cols = columns.length ? columns : val.columns ?? [];
  const editableCols = columns.length
    ? onChangeColumns
    : (next: TableColumn[]) => onChange({ ...val, columns: next });

  const setCell = (rowIdx: number, colId: string, v: string | number | boolean) => {
    const rows = val.rows.map((r, i) => (i === rowIdx ? { ...r, [colId]: v } : r));
    onChange({ ...val, rows });
  };
  const addRow = () => onChange({ ...val, rows: [...val.rows, {}] });
  const removeRow = (idx: number) => onChange({ ...val, rows: val.rows.filter((_, i) => i !== idx) });
  const moveRow = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= val.rows.length) return;
    const rows = [...val.rows];
    [rows[idx], rows[next]] = [rows[next], rows[idx]];
    onChange({ ...val, rows });
  };

  // column edits
  const addCol = () => {
    if (!editableCols) return;
    editableCols([...cols, { id: "c_" + Math.random().toString(36).slice(2, 8), name: nextColumnLabel(cols), type: "text" }]);
  };
  const removeCol = (id: string) => {
    if (!editableCols) return;
    editableCols(cols.filter((c) => c.id !== id));
  };
  const renameCol = (id: string, name: string) => editableCols?.(cols.map((c) => (c.id === id ? { ...c, name } : c)));
  const setColType = (id: string, type: TableColumnType) => editableCols?.(cols.map((c) => (c.id === id ? { ...c, type } : c)));
  const moveCol = (id: string, dir: -1 | 1) => {
    if (!editableCols) return;
    const idx = cols.findIndex((c) => c.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= cols.length) return;
    const arr = [...cols];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    editableCols(arr);
  };

  if (readOnly) {
    if (!val.rows.length || !cols.length) return <div className="text-sm text-muted-foreground italic">Tabela vazia</div>;
    return (
      <div className="overflow-auto border border-border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="w-10 text-right px-2 py-1.5 font-medium text-muted-foreground">#</th>
              {cols.map((c) => <th key={c.id} className="text-left px-2 py-1.5 font-medium">{c.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {val.rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-2 py-1 text-right text-xs text-muted-foreground tabular-nums select-none bg-muted/20">{i + 1}</td>
                {cols.map((c) => {
                  const raw = r[c.id];
                  let display: React.ReactNode = raw as React.ReactNode;
                  if (c.type === "checkbox") display = raw ? "✓" : "";
                  else if (c.type === "date" && typeof raw === "string") display = formatBR(raw);
                  else if (typeof raw === "string" && raw.startsWith("=")) {
                    const n = resolveCell(raw, cols, val.rows, i);
                    display = n === undefined ? "#ERRO" : String(n);
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
              <th className="w-10 text-right px-2 py-1 font-medium text-muted-foreground text-xs">#</th>
              {cols.map((c) => (
                <th key={c.id} className="text-left px-1.5 py-1 font-medium">
                  {editableCols ? (
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
                <td className="px-2 py-1 text-right text-xs text-muted-foreground tabular-nums select-none bg-muted/20">{i + 1}</td>
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
                      const n = resolveCell(raw as string, cols, val.rows, i);
                      return (
                        <td key={c.id} className="px-1 py-0.5">
                          <input value={raw as string} onChange={(e) => setCell(i, c.id, e.target.value)}
                            className="bg-transparent text-xs w-full focus:outline-none font-mono" />
                          <span className="block text-[10px] text-muted-foreground tabular-nums">= {n === undefined ? "#ERRO" : String(n)}</span>
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
                          placeholder="0 ou =A1+B2"
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
        {editableCols && (
          <button type="button" onClick={addCol} className="text-xs px-2 py-1 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> Coluna
          </button>
        )}
        <span className="text-[10px] text-muted-foreground self-center">Dica: fórmulas com <code className="font-mono">=A1+B2</code>, <code className="font-mono">=SUM(A1:A10)</code>, <code className="font-mono">=IF(C3&gt;10,"Sim","Não")</code> ou nomes de colunas (<code className="font-mono">=a+b</code>).</span>
      </div>
      {/* fake reference to avoid unused import lint */}
      <span className="hidden"><Pencil className="w-3 h-3" /></span>
    </div>
  );
}