## Plan — Void: Major Feature Update

A big batch of features. I'll implement everything below in one pass, no external dependencies added (all in-project, using existing shadcn + lucide).

### 1. Template Manager fixes
- Widen selected-category button + reorder header row so the name input isn't clipped (drop icon into second row, give name full width).
- Collapse/expand categories in the left tree (chevron; state per-node in local `useState`).
- Full config editor per field: `select` → options list (add/remove/edit), `relationship` → target template + single/multi, `number` → min/max/step, `table` → columns editor. Rendered inline under each field row (expand toggle).
- Hover-reveal Template Manager (settings gear) icon on **categories** in Sidebar (currently only on documents).

### 2. World / project icon color
- Add `iconColor` to `ProjectMeta`. Add color input next to icon selector in the project header rename dialog. Apply in Sidebar header + MainMenu list.

### 3. New field type: **Table**
- New `FieldType "table"`. `FieldDef` extras: `columns: { id, name, type: "text"|"number"|"date"|"checkbox" }[]`.
- Value shape: `{ rows: Record<colId,string|number|boolean>[] }`.
- Component `TableField.tsx` with add/remove/rename/reorder rows & columns, per-column type input rendering.
- Equations: when a cell begins with `=`, evaluate a simple expression referencing other named cells by row (e.g. `=a+b` where a/b are column names in that row). Safe evaluator: tokenize numbers/identifiers/`+ - * / ( )`, resolve identifiers to numeric cells in same row.
- Editable in Edit mode, read-only rendered table in Read mode.
- Add to Template Manager add-field UI and per-field config (columns editor).

### 4. Shortcuts
- Alt+K → open command palette (in addition to Ctrl+K).
- Ctrl+Shift+V → toggle document read/edit mode (DocumentView listens when active).
- Ctrl+Z / Ctrl+Y → undo/redo. Wrap reducer with a history stack in store (skip UI-only actions: `openTab`, `closeTab`, `setActiveTab`, `setView`, `setActiveMap`, `hydrate`). Expose `undo()`/`redo()` via context; register global keys (ignore when focus is in input/textarea/contenteditable to keep native behavior there).

### 5. Brazilian date format
- All date inputs stay `<input type="date">` (ISO under the hood) but read-mode display uses `dd/MM/yyyy` via a helper `formatBR(iso)`. Apply in DocumentView and TableField date columns.

### 6. First-launch tutorial prompt
- On MainMenu / app boot: if `localStorage["void_tutorial_prompt"]` unset, show AlertDialog with **Sim / Não / Não mostrar novamente**. "Sim" opens TutorialDialog; "Não mostrar" sets flag.

### 7. Wiki-links `@(Document Name)`
- Extend `richFormat.ts` to detect `@(name)` and render a `<a class="wiki-link">` styled red if no document matches, primary color if it does. Click opens that document (dispatch a custom event `void:open-doc`).
- RichTextField preview + DocumentView listen and call `openTab`.

### 8. New views
- **Gallery** view: shows every image field value + map images as a masonry grid; click opens the source document.
- **Statistics** view: bar chart (pure divs) of doc counts per template, sorted desc.
- **Trash** view + soft-delete: add `deletedAt?: number` to `DocumentEntry`. `deleteDocument` now marks deleted; a new `purgeDocument` permanently removes; `restoreDocument` unsets `deletedAt`. Filter deleted out of Sidebar / Graph / Timeline / Gallery / Stats / Command palette. Trash view lists them with Restore + Delete Forever.
- Add all three to Sidebar view switcher + CommandPalette.

### Technical Notes
- `store.tsx`: wrap reducer for undo/redo; new actions `purgeDocument`, `restoreDocument`; filter helpers `activeDocuments(state)`.
- `types.ts`: `deletedAt?`, `columns?` on FieldDef, `iconColor?` on ProjectMeta.
- `richFormat.ts`: pass in `documents` list; return HTML string as today; wiki-link uses `data-doc-id` attribute; preview container attaches delegated click handler.
- No new npm packages.

### Out of scope / assumptions
- Equations are single-row only (columns in same row) to keep it predictable; documented in Tutorial.
- No cell-format picker beyond the four types.
- Undo history capped at 50 entries.

I'll then run typecheck + a quick preview smoke check.
