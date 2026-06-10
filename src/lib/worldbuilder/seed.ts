import type { Template, DocumentEntry } from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

export function buildSeed(): { templates: Template[]; documents: DocumentEntry[] } {
  const charTpl: Template = {
    id: "tpl_char",
    name: "Characters",
    icon: "User",
    color: "#e0a96d",
    fields: [
      { id: "f_role", name: "Role", type: "text" },
      { id: "f_age", name: "Age", type: "number" },
      { id: "f_align", name: "Alignment", type: "select", options: ["Lawful Good", "Neutral", "Chaotic", "Evil"] },
      { id: "f_alive", name: "Alive", type: "boolean" },
      { id: "f_born", name: "Date of Birth", type: "date" },
      { id: "f_portrait", name: "Portrait", type: "image" },
      { id: "f_bio", name: "Biography", type: "richtext" },
      { id: "f_loc", name: "Home Location", type: "relationship", targetTemplateId: "tpl_loc" },
      { id: "f_allies", name: "Allies", type: "relationship", multi: true, targetTemplateId: "tpl_char" },
    ],
  };
  const locTpl: Template = {
    id: "tpl_loc",
    name: "Locations",
    icon: "MapPin",
    color: "#7dd3c0",
    fields: [
      { id: "f_type", name: "Type", type: "select", options: ["City", "Kingdom", "Forest", "Ruin", "Dungeon"] },
      { id: "f_pop", name: "Population", type: "number" },
      { id: "f_founded", name: "Founded", type: "date" },
      { id: "f_img", name: "Image", type: "image" },
      { id: "f_desc", name: "Description", type: "richtext" },
    ],
  };
  const magicTpl: Template = {
    id: "tpl_magic",
    name: "Magic Systems",
    icon: "Sparkles",
    color: "#a78bfa",
    fields: [
      { id: "f_source", name: "Source", type: "text" },
      { id: "f_cost", name: "Cost", type: "text" },
      { id: "f_rules", name: "Rules", type: "richtext" },
      { id: "f_users", name: "Notable Practitioners", type: "relationship", multi: true, targetTemplateId: "tpl_char" },
    ],
  };

  const now = Date.now();
  const documents: DocumentEntry[] = [
    {
      id: uid(),
      templateId: "tpl_loc",
      title: "Eldermere",
      values: { f_type: "City", f_pop: 14200, f_founded: "0824-06-12", f_desc: "<p>A storied harbor city carved into obsidian cliffs.</p>" },
      createdAt: now, updatedAt: now,
    },
    {
      id: uid(),
      templateId: "tpl_char",
      title: "Aria Veyne",
      values: { f_role: "Archivist", f_age: 27, f_align: "Neutral", f_alive: true, f_born: "0998-03-04", f_bio: "<p>Keeper of the Obsidian Codex.</p>" },
      createdAt: now, updatedAt: now,
    },
    {
      id: uid(),
      templateId: "tpl_magic",
      title: "Veinweaving",
      values: { f_source: "Bloodline", f_cost: "Vitality", f_rules: "<p>Practitioners trade years of life for control over mineral veins.</p>" },
      createdAt: now, updatedAt: now,
    },
  ];
  return { templates: [charTpl, locTpl, magicTpl], documents };
}