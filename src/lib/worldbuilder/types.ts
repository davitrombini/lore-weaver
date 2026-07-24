export type FieldType =
  | "text"
  | "richtext"
  | "number"
  | "select"
  | "boolean"
  | "date"
  | "image"
  | "relationship"
  | "table";

export type TableColumnType = "text" | "number" | "date" | "checkbox";

export interface TableColumn {
  id: string;
  name: string;
  type: TableColumnType;
}

export interface FieldDef {
  id: string;
  name: string;
  type: FieldType;
  options?: string[]; // for select
  targetTemplateId?: string; // for relationship; empty = any
  multi?: boolean; // for relationship
  columns?: TableColumn[]; // for table
}

export interface Template {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color?: string;
  textColor?: string;
  bgColor?: string;
  fields: FieldDef[];
  parentId?: string | null; // for sub-categories (nested templates)
}

export interface DocumentEntry {
  id: string;
  templateId: string;
  title: string;
  values: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface MapPin {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
  documentId?: string;
  label?: string;
}

export interface WorldMap {
  id: string;
  name: string;
  image: string; // data URL
  pins: MapPin[];
}

export interface WorkspaceState {
  templates: Template[];
  documents: DocumentEntry[];
  maps: WorldMap[];
  openTabs: string[]; // document ids
  activeTab: string | null;
  view: "document" | "graph" | "timeline" | "map" | "gallery" | "stats" | "trash";
  activeMapId: string | null;
  settings?: {
    hideEmptyFields?: boolean;
  };
}

export interface ProjectMeta {
  id: string;
  name: string;
  icon: string; // lucide icon name
  iconColor?: string;
  updatedAt: number;
}

export interface ProjectsIndex {
  projects: ProjectMeta[];
  currentId: string | null;
}