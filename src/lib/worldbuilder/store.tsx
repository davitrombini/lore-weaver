import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { DocumentEntry, Template, WorkspaceState, WorldMap, MapPin, FieldDef } from "./types";
import { buildSeed } from "./seed";

const STORAGE_KEY = "worldbuilder_state_v1";
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
  | { type: "setActiveMap"; id: string | null };

function initial(): WorkspaceState {
  const seed = buildSeed();
  return {
    templates: seed.templates,
    documents: seed.documents,
    maps: [],
    openTabs: seed.documents.slice(0, 1).map((d) => d.id),
    activeTab: seed.documents[0]?.id ?? null,
    view: "document",
    activeMapId: null,
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
        templates: state.templates.filter((t) => t.id !== action.id),
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
    case "setActiveMap":
      return { ...state, activeMapId: action.id };
  }
}

interface Ctx {
  state: WorkspaceState;
  // templates
  createTemplate: (name: string, icon?: string) => Template;
  updateTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;
  addField: (templateId: string, field: Omit<FieldDef, "id">) => void;
  removeField: (templateId: string, fieldId: string) => void;
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
  addPin: (mapId: string, pin: Omit<MapPin, "id">) => void;
  removePin: (mapId: string, pinId: string) => void;
  updatePin: (mapId: string, pinId: string, patch: Partial<MapPin>) => void;
  setActiveMap: (id: string | null) => void;
}

const WorldCtx = createContext<Ctx | null>(null);

export function WorldProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);

  // hydrate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WorkspaceState;
        dispatch({ type: "hydrate", payload: parsed });
      }
    } catch {}
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const createTemplate = useCallback((name: string, icon = "FileText"): Template => {
    const t: Template = { id: "tpl_" + uid(), name, icon, fields: [] };
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

  const value = useMemo<Ctx>(
    () => ({
      state,
      createTemplate, updateTemplate, deleteTemplate, addField, removeField,
      createDocument, updateDocument, deleteDocument,
      openTab, closeTab, setActiveTab,
      setView,
      addMap, updateMap, addPin, removePin, updatePin, setActiveMap,
    }),
    [state, createTemplate, updateTemplate, deleteTemplate, addField, removeField, createDocument, updateDocument, deleteDocument, openTab, closeTab, setActiveTab, addMap, updateMap, addPin, removePin, updatePin, setActiveMap],
  );

  return <WorldCtx.Provider value={value}>{children}</WorldCtx.Provider>;
}

export function useWorld() {
  const ctx = useContext(WorldCtx);
  if (!ctx) throw new Error("useWorld outside provider");
  return ctx;
}