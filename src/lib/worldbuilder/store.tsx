import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import type { DocumentEntry, Template, WorkspaceState, WorldMap, MapPin, FieldDef } from "./types";
import { buildSeed } from "./seed";

const LEGACY_KEY = "worldbuilder_state_v1";
const storageKeyFor = (projectId: string) => `void_project_${projectId}`;
const uid = () => Math.random().toString(36).slice(2, 10);

type Action =
  | { type: "hydrate"; payload: WorkspaceState }
  | { type: "addTemplate"; template: Template }
  | { type: "updateTemplate"; template: Template }
  | { type: "deleteTemplate"; id: string }
  | { type: "addDocument"; doc: DocumentEntry }
  | { type: "updateDocument"; id: string; patch: Partial<DocumentEntry> }
  | { type: "deleteDocument"; id: string }
  | { type: "openTab"; id: string }
  | { type: "closeTab"; id: string }
  | { type: "setActiveTab"; id: string | null }
  | { type: "setView"; view: WorkspaceState["view"] }
  | { type: "addMap"; map: WorldMap }
  | { type: "updateMap"; id: string; patch: Partial<WorldMap> }
  | { type: "deleteMap"; id: string }
  | { type: "setActiveMap"; id: string | null }
  | { type: "setSettings"; patch: Partial<NonNullable<WorkspaceState["settings"]>> };

function initial(seeded = true): WorkspaceState {
  const seed = seeded ? buildSeed() : { templates: [], documents: [] };
  return {
    templates: seed.templates,
    documents: seed.documents,
    maps: [],
    openTabs: seed.documents.slice(0, 1).map((d) => d.id),
    activeTab: seed.documents[0]?.id ?? null,
    view: "document",
    activeMapId: null,
    settings: { hideEmptyFields: false },
  };
}

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case "hydrate":
      return action.payload;
    case "addTemplate":
      return { ...state, templates: [...state.templates, action.template] };
    case "updateTemplate":
      return {
        ...state,
        templates: state.templates.map((t) => (t.id === action.template.id ? action.template : t)),
      };
    case "deleteTemplate":
      return {
        ...state,
        templates: state.templates
          .filter((t) => t.id !== action.id)
          .map((t) => (t.parentId === action.id ? { ...t, parentId: null } : t)),
        documents: state.documents.filter((d) => d.templateId !== action.id),
      };
    case "addDocument":
      return { ...state, documents: [...state.documents, action.doc] };
    case "updateDocument":
      return {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.id ? { ...d, ...action.patch, updatedAt: Date.now() } : d,
        ),
      };
    case "deleteDocument": {
      const openTabs = state.openTabs.filter((t) => t !== action.id);
      return {
        ...state,
        documents: state.documents.filter((d) => d.id !== action.id),
        openTabs,
        activeTab: state.activeTab === action.id ? openTabs[0] ?? null : state.activeTab,
      };
    }
    case "openTab": {
      const tabs = state.openTabs.includes(action.id) ? state.openTabs : [...state.openTabs, action.id];
      return { ...state, openTabs: tabs, activeTab: action.id, view: "document" };
    }
    case "closeTab": {
      const idx = state.openTabs.indexOf(action.id);
      const tabs = state.openTabs.filter((t) => t !== action.id);
      let active = state.activeTab;
      if (state.activeTab === action.id) {
        active = tabs[Math.max(0, idx - 1)] ?? null;
      }
      return { ...state, openTabs: tabs, activeTab: active };
    }
    case "setActiveTab":
      return { ...state, activeTab: action.id, view: action.id ? "document" : state.view };
    case "setView":
      return { ...state, view: action.view };
    case "addMap":
      return { ...state, maps: [...state.maps, action.map], activeMapId: action.map.id };
    case "updateMap":
      return {
        ...state,
        maps: state.maps.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)),
      };
    case "deleteMap":
      return {
        ...state,
        maps: state.maps.filter((m) => m.id !== action.id),
        activeMapId: state.activeMapId === action.id ? null : state.activeMapId,
      };
    case "setActiveMap":
      return { ...state, activeMapId: action.id };
    case "setSettings":
      return { ...state, settings: { ...(state.settings ?? {}), ...action.patch } };
  }
}


interface Ctx {
  state: WorkspaceState;
  // templates
  createTemplate: (name: string, icon?: string, parentId?: string | null) => Template;
  updateTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;
  addField: (templateId: string, field: Omit<FieldDef, "id">) => void;
  removeField: (templateId: string, fieldId: string) => void;
  updateField: (templateId: string, fieldId: string, patch: Partial<FieldDef>) => void;
  moveField: (templateId: string, fieldId: string, direction: -1 | 1) => void;
  // documents
  createDocument: (templateId: string, title?: string) => DocumentEntry;
  updateDocument: (id: string, patch: Partial<DocumentEntry>) => void;
  deleteDocument: (id: string) => void;
  // tabs
  openTab: (id: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  setView: (v: WorkspaceState["view"]) => void;
  // maps
  addMap: (name: string, image: string) => WorldMap;
  updateMap: (id: string, patch: Partial<WorldMap>) => void;
  deleteMap: (id: string) => void;
  addPin: (mapId: string, pin: Omit<MapPin, "id">) => void;
  removePin: (mapId: string, pinId: string) => void;
  updatePin: (mapId: string, pinId: string, patch: Partial<MapPin>) => void;
  setActiveMap: (id: string | null) => void;
  setSettings: (patch: Partial<NonNullable<WorkspaceState["settings"]>>) => void;
  replaceState: (next: WorkspaceState) => void;
}

const WorldCtx = createContext<Ctx | null>(null);

export function WorldProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    if (typeof window === "undefined") return initial(false);
    try {
      const raw = localStorage.getItem(storageKeyFor(projectId));
      if (raw) return JSON.parse(raw) as WorkspaceState;
      // legacy fallback (only for the first migrated project)
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        localStorage.removeItem(LEGACY_KEY);
        return JSON.parse(legacy) as WorkspaceState;
      }
    } catch {}
    return initial(true);
  });

  const firstSave = useRef(true);
  useEffect(() => {
    // skip the very first run to avoid clobbering an existing snapshot during hydration
    if (firstSave.current) { firstSave.current = false; return; }
    try {
      localStorage.setItem(storageKeyFor(projectId), JSON.stringify(state));
    } catch {}
  }, [state, projectId]);

  const createTemplate = useCallback((name: string, icon = "FileText", parentId: string | null = null): Template => {
    const t: Template = { id: "tpl_" + uid(), name, icon, fields: [], parentId: parentId ?? null };
    dispatch({ type: "addTemplate", template: t });
    return t;
  }, []);

  const updateTemplate = useCallback((t: Template) => dispatch({ type: "updateTemplate", template: t }), []);
  const deleteTemplate = useCallback((id: string) => dispatch({ type: "deleteTemplate", id }), []);

  const addField = useCallback(
    (templateId: string, field: Omit<FieldDef, "id">) => {
      const tpl = state.templates.find((t) => t.id === templateId);
      if (!tpl) return;
      const next: Template = { ...tpl, fields: [...tpl.fields, { ...field, id: "f_" + uid() }] };
      dispatch({ type: "updateTemplate", template: next });
    },
    [state.templates],
  );

  const removeField = useCallback(
    (templateId: string, fieldId: string) => {
      const tpl = state.templates.find((t) => t.id === templateId);
      if (!tpl) return;
      dispatch({
        type: "updateTemplate",
        template: { ...tpl, fields: tpl.fields.filter((f) => f.id !== fieldId) },
      });
    },
    [state.templates],
  );

  const updateField = useCallback(
    (templateId: string, fieldId: string, patch: Partial<FieldDef>) => {
      const tpl = state.templates.find((t) => t.id === templateId);
      if (!tpl) return;
      dispatch({
        type: "updateTemplate",
        template: { ...tpl, fields: tpl.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) },
      });
    },
    [state.templates],
  );

  const moveField = useCallback(
    (templateId: string, fieldId: string, direction: -1 | 1) => {
      const tpl = state.templates.find((t) => t.id === templateId);
      if (!tpl) return;
      const idx = tpl.fields.findIndex((f) => f.id === fieldId);
      const next = idx + direction;
      if (idx < 0 || next < 0 || next >= tpl.fields.length) return;
      const fields = [...tpl.fields];
      [fields[idx], fields[next]] = [fields[next], fields[idx]];
      dispatch({ type: "updateTemplate", template: { ...tpl, fields } });
    },
    [state.templates],
  );

  const createDocument = useCallback((templateId: string, title = "Untitled"): DocumentEntry => {
    const doc: DocumentEntry = {
      id: "doc_" + uid(),
      templateId,
      title,
      values: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch({ type: "addDocument", doc });
    dispatch({ type: "openTab", id: doc.id });
    return doc;
  }, []);

  const updateDocument = useCallback(
    (id: string, patch: Partial<DocumentEntry>) => dispatch({ type: "updateDocument", id, patch }),
    [],
  );
  const deleteDocument = useCallback((id: string) => dispatch({ type: "deleteDocument", id }), []);
  const openTab = useCallback((id: string) => dispatch({ type: "openTab", id }), []);
  const closeTab = useCallback((id: string) => dispatch({ type: "closeTab", id }), []);
  const setActiveTab = useCallback((id: string | null) => dispatch({ type: "setActiveTab", id }), []);
  const setView = useCallback((v: WorkspaceState["view"]) => dispatch({ type: "setView", view: v }), []);

  const addMap = useCallback((name: string, image: string): WorldMap => {
    const m: WorldMap = { id: "map_" + uid(), name, image, pins: [] };
    dispatch({ type: "addMap", map: m });
    return m;
  }, []);

  const updateMap = useCallback(
    (id: string, patch: Partial<WorldMap>) => dispatch({ type: "updateMap", id, patch }),
    [],
  );

  const deleteMap = useCallback((id: string) => dispatch({ type: "deleteMap", id }), []);

  const addPin = useCallback(
    (mapId: string, pin: Omit<MapPin, "id">) => {
      const m = state.maps.find((x) => x.id === mapId);
      if (!m) return;
      const newPin: MapPin = { ...pin, id: "pin_" + uid() };
      dispatch({ type: "updateMap", id: mapId, patch: { pins: [...m.pins, newPin] } });
    },
    [state.maps],
  );

  const removePin = useCallback(
    (mapId: string, pinId: string) => {
      const m = state.maps.find((x) => x.id === mapId);
      if (!m) return;
      dispatch({ type: "updateMap", id: mapId, patch: { pins: m.pins.filter((p) => p.id !== pinId) } });
    },
    [state.maps],
  );

  const updatePin = useCallback(
    (mapId: string, pinId: string, patch: Partial<MapPin>) => {
      const m = state.maps.find((x) => x.id === mapId);
      if (!m) return;
      dispatch({
        type: "updateMap",
        id: mapId,
        patch: { pins: m.pins.map((p) => (p.id === pinId ? { ...p, ...patch } : p)) },
      });
    },
    [state.maps],
  );

  const setActiveMap = useCallback((id: string | null) => dispatch({ type: "setActiveMap", id }), []);

  const setSettings = useCallback(
    (patch: Partial<NonNullable<WorkspaceState["settings"]>>) => dispatch({ type: "setSettings", patch }),
    [],
  );

  const replaceState = useCallback((next: WorkspaceState) => dispatch({ type: "hydrate", payload: next }), []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      createTemplate, updateTemplate, deleteTemplate, addField, removeField, updateField, moveField,
      createDocument, updateDocument, deleteDocument,
      openTab, closeTab, setActiveTab,
      setView,
      addMap, updateMap, deleteMap, addPin, removePin, updatePin, setActiveMap,
      setSettings, replaceState,
    }),
    [state, createTemplate, updateTemplate, deleteTemplate, addField, removeField, updateField, moveField, createDocument, updateDocument, deleteDocument, openTab, closeTab, setActiveTab, setView, addMap, updateMap, deleteMap, addPin, removePin, updatePin, setActiveMap, setSettings, replaceState],
  );

  return <WorldCtx.Provider value={value}>{children}</WorldCtx.Provider>;
}

export function useWorld() {
  const ctx = useContext(WorldCtx);
  if (!ctx) throw new Error("useWorld outside provider");
  return ctx;
}