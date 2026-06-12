import type { Template, DocumentEntry } from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

export function buildSeed(): { templates: Template[]; documents: DocumentEntry[] } {
  const charTpl: Template = {
    id: "tpl_char",
    name: "Personagens",
    icon: "User",
    color: "#e0a96d",
    fields: [
      { id: "f_role", name: "Função", type: "text" },
      { id: "f_age", name: "Idade", type: "number" },
      { id: "f_align", name: "Alinhamento", type: "select", options: ["Leal e Bom", "Neutro", "Caótico", "Maligno"] },
      { id: "f_alive", name: "Vivo", type: "boolean" },
      { id: "f_born", name: "Data de Nascimento", type: "date" },
      { id: "f_portrait", name: "Retrato", type: "image" },
      { id: "f_bio", name: "Biografia", type: "richtext" },
      { id: "f_loc", name: "Local de Origem", type: "relationship", targetTemplateId: "tpl_loc" },
      { id: "f_allies", name: "Aliados", type: "relationship", multi: true, targetTemplateId: "tpl_char" },
    ],
  };
  const locTpl: Template = {
    id: "tpl_loc",
    name: "Locais",
    icon: "MapPin",
    color: "#7dd3c0",
    fields: [
      { id: "f_type", name: "Tipo", type: "select", options: ["Cidade", "Reino", "Floresta", "Ruína", "Masmorra"] },
      { id: "f_pop", name: "População", type: "number" },
      { id: "f_founded", name: "Fundado em", type: "date" },
      { id: "f_img", name: "Imagem", type: "image" },
      { id: "f_desc", name: "Descrição", type: "richtext" },
    ],
  };
  const magicTpl: Template = {
    id: "tpl_magic",
    name: "Sistemas de Magia",
    icon: "Sparkles",
    color: "#a78bfa",
    fields: [
      { id: "f_source", name: "Fonte", type: "text" },
      { id: "f_cost", name: "Custo", type: "text" },
      { id: "f_rules", name: "Regras", type: "richtext" },
      { id: "f_users", name: "Praticantes Notáveis", type: "relationship", multi: true, targetTemplateId: "tpl_char" },
    ],
  };

  const now = Date.now();
  const documents: DocumentEntry[] = [
    {
      id: uid(),
      templateId: "tpl_loc",
      title: "Eldermere",
      values: { f_type: "Cidade", f_pop: 14200, f_founded: "0824-06-12", f_desc: "<p>Uma lendária cidade portuária esculpida em penhascos de obsidiana.</p>" },
      createdAt: now, updatedAt: now,
    },
    {
      id: uid(),
      templateId: "tpl_char",
      title: "Aria Veyne",
      values: { f_role: "Arquivista", f_age: 27, f_align: "Neutro", f_alive: true, f_born: "0998-03-04", f_bio: "<p>Guardiã do Void.</p>" },
      createdAt: now, updatedAt: now,
    },
    {
      id: uid(),
      templateId: "tpl_magic",
      title: "Tecer-de-Veias",
      values: { f_source: "Linhagem", f_cost: "Vitalidade", f_rules: "<p>Praticantes trocam anos de vida pelo controle sobre veios minerais.</p>" },
      createdAt: now, updatedAt: now,
    },
  ];
  return { templates: [charTpl, locTpl, magicTpl], documents };
}