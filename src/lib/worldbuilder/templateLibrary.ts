import type { Template } from "./types";

// Pre-built templates users can add to their world.
// IDs use a `lib_` prefix and get re-mapped at insertion time.
export const TEMPLATE_LIBRARY: (Template & { description: string; category: string })[] = [
  {
    id: "lib_character", name: "Personagens", icon: "User", color: "#e0a96d",
    category: "Pessoas", description: "Heróis, vilões e figurantes do seu mundo.",
    fields: [
      { id: "f1", name: "Função", type: "text" },
      { id: "f2", name: "Idade", type: "number" },
      { id: "f3", name: "Alinhamento", type: "select", options: ["Leal e Bom","Neutro Bom","Caótico Bom","Leal Neutro","Neutro","Caótico Neutro","Leal Mau","Neutro Mau","Caótico Mau"] },
      { id: "f4", name: "Vivo", type: "boolean" },
      { id: "f5", name: "Nascimento", type: "date" },
      { id: "f6", name: "Retrato", type: "image" },
      { id: "f7", name: "Biografia", type: "richtext" },
    ],
  },
  {
    id: "lib_location", name: "Locais", icon: "MapPin", color: "#7dd3c0",
    category: "Geografia", description: "Cidades, regiões, ruínas e pontos de interesse.",
    fields: [
      { id: "f1", name: "Tipo", type: "select", options: ["Cidade","Vilarejo","Reino","Floresta","Ruína","Masmorra","Montanha"] },
      { id: "f2", name: "População", type: "number" },
      { id: "f3", name: "Fundado em", type: "date" },
      { id: "f4", name: "Imagem", type: "image" },
      { id: "f5", name: "Descrição", type: "richtext" },
    ],
  },
  {
    id: "lib_faction", name: "Facções", icon: "Shield", color: "#f87171",
    category: "Sociedade", description: "Guildas, ordens, sindicatos e cultos.",
    fields: [
      { id: "f1", name: "Tipo", type: "select", options: ["Guilda","Ordem","Culto","Governo","Família","Mercenários"] },
      { id: "f2", name: "Símbolo", type: "image" },
      { id: "f3", name: "Ideologia", type: "richtext" },
      { id: "f4", name: "Fundação", type: "date" },
    ],
  },
  {
    id: "lib_magic", name: "Sistemas de Magia", icon: "Sparkles", color: "#a78bfa",
    category: "Sobrenatural", description: "Regras de magia, fontes e custos.",
    fields: [
      { id: "f1", name: "Fonte", type: "text" },
      { id: "f2", name: "Custo", type: "text" },
      { id: "f3", name: "Regras", type: "richtext" },
    ],
  },
  {
    id: "lib_item", name: "Itens", icon: "Gem", color: "#fbbf24",
    category: "Objetos", description: "Equipamentos, relíquias e artefatos.",
    fields: [
      { id: "f1", name: "Raridade", type: "select", options: ["Comum","Incomum","Raro","Épico","Lendário","Artefato"] },
      { id: "f2", name: "Tipo", type: "select", options: ["Arma","Armadura","Poção","Pergaminho","Relíquia","Ferramenta"] },
      { id: "f3", name: "Valor", type: "number" },
      { id: "f4", name: "Imagem", type: "image" },
      { id: "f5", name: "Descrição", type: "richtext" },
    ],
  },
  {
    id: "lib_creature", name: "Criaturas", icon: "Skull", color: "#94a3b8",
    category: "Bestiário", description: "Monstros, animais e abominações.",
    fields: [
      { id: "f1", name: "Tamanho", type: "select", options: ["Minúsculo","Pequeno","Médio","Grande","Enorme","Colossal"] },
      { id: "f2", name: "Habitat", type: "text" },
      { id: "f3", name: "Nível de Ameaça", type: "number" },
      { id: "f4", name: "Imagem", type: "image" },
      { id: "f5", name: "Comportamento", type: "richtext" },
    ],
  },
  {
    id: "lib_race", name: "Raças", icon: "Users", color: "#34d399",
    category: "Pessoas", description: "Povos e espécies inteligentes.",
    fields: [
      { id: "f1", name: "Origem", type: "text" },
      { id: "f2", name: "Expectativa de Vida", type: "number" },
      { id: "f3", name: "Cultura", type: "richtext" },
    ],
  },
  {
    id: "lib_religion", name: "Religiões", icon: "Flame", color: "#fb923c",
    category: "Sociedade", description: "Panteões, doutrinas e cultos religiosos.",
    fields: [
      { id: "f1", name: "Divindade Principal", type: "text" },
      { id: "f2", name: "Símbolo", type: "image" },
      { id: "f3", name: "Crenças", type: "richtext" },
    ],
  },
  {
    id: "lib_event", name: "Eventos Históricos", icon: "Scroll", color: "#c084fc",
    category: "História", description: "Guerras, descobertas e marcos do mundo.",
    fields: [
      { id: "f1", name: "Data", type: "date" },
      { id: "f2", name: "Local", type: "text" },
      { id: "f3", name: "Resumo", type: "richtext" },
    ],
  },
  {
    id: "lib_language", name: "Idiomas", icon: "BookOpen", color: "#60a5fa",
    category: "Cultura", description: "Línguas faladas, escritas e mortas.",
    fields: [
      { id: "f1", name: "Falantes", type: "number" },
      { id: "f2", name: "Alfabeto", type: "text" },
      { id: "f3", name: "Exemplo", type: "richtext" },
    ],
  },
  {
    id: "lib_quest", name: "Missões", icon: "Compass", color: "#facc15",
    category: "Campanha", description: "Aventuras e arcos narrativos.",
    fields: [
      { id: "f1", name: "Tipo", type: "select", options: ["Principal","Secundária","Diária","Pessoal"] },
      { id: "f2", name: "Status", type: "select", options: ["Não Iniciada","Em Andamento","Concluída","Falhada"] },
      { id: "f3", name: "Recompensa", type: "text" },
      { id: "f4", name: "Descrição", type: "richtext" },
    ],
  },
  {
    id: "lib_session", name: "Sessões de Jogo", icon: "Book", color: "#22d3ee",
    category: "Campanha", description: "Registros das sessões de RPG.",
    fields: [
      { id: "f1", name: "Data", type: "date" },
      { id: "f2", name: "Número da Sessão", type: "number" },
      { id: "f3", name: "Resumo", type: "richtext" },
    ],
  },
  {
    id: "lib_organization", name: "Organizações", icon: "Crown", color: "#eab308" ,
    category: "Sociedade", description: "Empresas, conselhos e instituições.",
    fields: [
      { id: "f1", name: "Sede", type: "text" },
      { id: "f2", name: "Líder", type: "text" },
      { id: "f3", name: "Propósito", type: "richtext" },
    ],
  },
  {
    id: "lib_vehicle", name: "Veículos", icon: "Anchor", color: "#38bdf8",
    category: "Objetos", description: "Navios, montarias e máquinas de transporte.",
    fields: [
      { id: "f1", name: "Tipo", type: "select", options: ["Marítimo","Terrestre","Aéreo","Mágico"] },
      { id: "f2", name: "Capacidade", type: "number" },
      { id: "f3", name: "Descrição", type: "richtext" },
    ],
  },
  {
    id: "lib_deity", name: "Divindades", icon: "Star", color: "#f472b6",
    category: "Sobrenatural", description: "Deuses, demônios e seres divinos.",
    fields: [
      { id: "f1", name: "Domínio", type: "text" },
      { id: "f2", name: "Alinhamento", type: "text" },
      { id: "f3", name: "Mitos", type: "richtext" },
    ],
  },
  {
    id: "lib_plant", name: "Plantas", icon: "Trees", color: "#4ade80",
    category: "Bestiário", description: "Flora, ervas e fungos.",
    fields: [
      { id: "f1", name: "Habitat", type: "text" },
      { id: "f2", name: "Propriedades", type: "richtext" },
    ],
  },
  {
    id: "lib_culture", name: "Culturas", icon: "Feather", color: "#fde047",
    category: "Cultura", description: "Costumes, ritos e tradições.",
    fields: [
      { id: "f1", name: "Origem", type: "text" },
      { id: "f2", name: "Valores", type: "richtext" },
    ],
  },
  {
    id: "lib_law", name: "Leis", icon: "Key", color: "#a3a3a3",
    category: "Sociedade", description: "Códigos legais e edits.",
    fields: [
      { id: "f1", name: "Jurisdição", type: "text" },
      { id: "f2", name: "Pena", type: "text" },
      { id: "f3", name: "Texto", type: "richtext" },
    ],
  },
  {
    id: "lib_technology", name: "Tecnologias", icon: "Hexagon", color: "#06b6d4",
    category: "Cultura", description: "Invenções e descobertas técnicas.",
    fields: [
      { id: "f1", name: "Era", type: "text" },
      { id: "f2", name: "Inventor", type: "text" },
      { id: "f3", name: "Funcionamento", type: "richtext" },
    ],
  },
  {
    id: "lib_battle", name: "Batalhas", icon: "Sword", color: "#dc2626",
    category: "História", description: "Combates e conflitos militares.",
    fields: [
      { id: "f1", name: "Data", type: "date" },
      { id: "f2", name: "Local", type: "text" },
      { id: "f3", name: "Vencedor", type: "text" },
      { id: "f4", name: "Crônica", type: "richtext" },
    ],
  },
  {
    id: "lib_kingdom", name: "Reinos", icon: "Castle", color: "#9333ea",
    category: "Geografia", description: "Nações e impérios.",
    fields: [
      { id: "f1", name: "Capital", type: "text" },
      { id: "f2", name: "Governante", type: "text" },
      { id: "f3", name: "Bandeira", type: "image" },
      { id: "f4", name: "História", type: "richtext" },
    ],
  },
  {
    id: "lib_class", name: "Classes", icon: "Sword", color: "#ef4444",
    category: "Mecânicas", description: "Classes de personagem jogáveis.",
    fields: [
      { id: "f1", name: "Dado de Vida", type: "text" },
      { id: "f2", name: "Atributo Principal", type: "text" },
      { id: "f3", name: "Habilidades", type: "richtext" },
    ],
  },
  {
    id: "lib_spell", name: "Magias", icon: "Sparkles", color: "#8b5cf6",
    category: "Sobrenatural", description: "Feitiços, encantamentos e rituais.",
    fields: [
      { id: "f1", name: "Nível", type: "number" },
      { id: "f2", name: "Escola", type: "select", options: ["Abjuração","Adivinhação","Conjuração","Encantamento","Evocação","Ilusão","Necromancia","Transmutação"] },
      { id: "f3", name: "Componentes", type: "text" },
      { id: "f4", name: "Efeito", type: "richtext" },
    ],
  },
  {
    id: "lib_relic", name: "Relíquias", icon: "Gem", color: "#d946ef",
    category: "Objetos", description: "Artefatos lendários e itens de poder.",
    fields: [
      { id: "f1", name: "Origem", type: "text" },
      { id: "f2", name: "Poderes", type: "richtext" },
      { id: "f3", name: "Imagem", type: "image" },
    ],
  },
  {
    id: "lib_lore", name: "Lendas", icon: "Scroll", color: "#fcd34d",
    category: "História", description: "Mitos, rumores e contos.",
    fields: [
      { id: "f1", name: "Origem", type: "text" },
      { id: "f2", name: "Conteúdo", type: "richtext" },
    ],
  },
];

export const LIBRARY_CATEGORIES = Array.from(new Set(TEMPLATE_LIBRARY.map((t) => t.category)));