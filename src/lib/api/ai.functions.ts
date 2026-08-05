import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .min(1)
    .max(40),
  context: z.string().max(60000),
});

const SYSTEM = `Você é o "Assistente do Void", uma IA especialista em worldbuilding e campanhas de RPG.
Você recebe um resumo em JSON do projeto do usuário (templates/categorias e documentos) e deve:
- responder SEMPRE em português do Brasil, em Markdown;
- usar o conteúdo do projeto para dar ideias coerentes, revisar e sugerir melhorias;
- quando o usuário pedir para CRIAR templates/categorias ou documentos, além da explicação, inclua
  ao final um bloco de código com a linguagem "void-action" contendo JSON no formato:

\`\`\`void-action
{"actions":[
  {"type":"createTemplate","name":"Nome","icon":"Users","color":"#e0a96d","textColor":"#ffffff","bgColor":"#1e293b","fields":[{"name":"Idade","type":"number"},{"name":"Papel","type":"select","options":["Herói","Vilão"]}]},
  {"type":"styleTemplate","name":"Nome","color":"#e0a96d","textColor":"#ffffff","bgColor":"#1e293b","icon":"Users"},
  {"type":"createDocument","templateName":"Nome","title":"Título","icon":"User","values":{"Idade":32,"Papel":"Herói"}}
]}
\`\`\`

Tipos de campo válidos: text, richtext, number, select, boolean, date, image, relationship, table.
"icon" deve ser um nome de ícone do lucide-react (ex.: Users, MapPin, Sparkles, Sword, Book).
Cores ("color" = cor do ícone, "textColor" = cor do texto na lista, "bgColor" = cor de fundo na lista)
devem ser HEX (#rrggbb). Use "styleTemplate" quando o usuário pedir só mudança visual de uma categoria.

Você também pode EDITAR os campos de uma categoria existente (sem criar outra) e GERAR IMAGENS
para documentos, usando estas ações no mesmo bloco void-action:

\`\`\`void-action
{"actions":[
  {"type":"updateTemplateFields","name":"Personagens",
    "addFields":[{"name":"Retrato","type":"image"}],
    "updateFields":[{"name":"Idade","newName":"Idade (anos)","type":"number"},{"name":"Papel","type":"select","options":["Herói","Vilão","Neutro"]}],
    "removeFields":["Campo Antigo"]},
  {"type":"generateImage","documentTitle":"Kaelen","fieldName":"Retrato","prompt":"retrato de um rei élfico, arte digital, iluminação dramática"}
]}
\`\`\`

Regras: em "updateTemplateFields" use os nomes atuais dos campos; só inclua as chaves necessárias.
Em "generateImage", o "prompt" deve ser descritivo e em inglês (melhor resultado); se o documento não
tiver campo de imagem, um campo será criado automaticamente.
Só inclua o bloco void-action quando o usuário realmente pedir criação/edição/imagem. Nunca invente IDs.`;

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator(Input)
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("LOVABLE_API_KEY não configurada");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "system", content: `Projeto atual (JSON resumido):\n${data.context}` },
          ...data.messages,
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos ao workspace.");
      throw new Error(`Falha na IA [${res.status}]: ${body}`);
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { text: json.choices?.[0]?.message?.content ?? "" };
  });

const ImageInput = z.object({ prompt: z.string().min(3).max(2000) });

export const generateDocImage = createServerFn({ method: "POST" })
  .inputValidator(ImageInput)
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("LOVABLE_API_KEY não configurada");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt: data.prompt,
        size: "1024x1024",
        quality: "low",
        n: 1,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos ao workspace.");
      throw new Error(`Falha ao gerar imagem [${res.status}]: ${body}`);
    }

    const json = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("A IA não retornou imagem.");
    return { dataUrl: `data:image/png;base64,${b64}` };
  });