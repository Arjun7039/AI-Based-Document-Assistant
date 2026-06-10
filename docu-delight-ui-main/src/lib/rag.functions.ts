import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const EMBED_MODEL = "google/gemini-embedding-001";
const CHAT_MODEL = "google/gemini-3-flash-preview";
const EMBED_DIM = 1536;

async function embed(input: string | string[]): Promise<number[][]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch(`${GATEWAY}/embeddings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input, dimensions: EMBED_DIM }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding failed (${res.status}): ${t}`);
  }
  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

function chunkText(text: string, chunkSize = 1200, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + chunkSize));
    if (i + chunkSize >= clean.length) break;
    i += chunkSize - overlap;
  }
  return chunks;
}

// ---- Documents ----

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("id,name,mime,size,status,char_count,chunk_count,error,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; mime: string; size: number; text: string }) =>
    z.object({
      name: z.string().min(1).max(300),
      mime: z.string().max(120),
      size: z.number().int().min(0).max(50_000_000),
      text: z.string().min(1).max(2_000_000),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: doc, error: insErr } = await supabase
      .from("documents")
      .insert({ user_id: userId, name: data.name, mime: data.mime, size: data.size, status: "processing", char_count: data.text.length })
      .select("id")
      .single();
    if (insErr || !doc) throw new Error(insErr?.message ?? "Failed to create document");

    try {
      const chunks = chunkText(data.text);
      if (chunks.length === 0) throw new Error("No text content found in file");

      // batch embed (chunks of 50)
      const batchSize = 32;
      const rows: { document_id: string; user_id: string; chunk_index: number; content: string; embedding: string }[] = [];
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const vectors = await embed(batch);
        batch.forEach((content, j) => {
          rows.push({
            document_id: doc.id,
            user_id: userId,
            chunk_index: i + j,
            content,
            embedding: `[${vectors[j].join(",")}]`,
          });
        });
      }
      const { error: chunkErr } = await supabase.from("document_chunks").insert(rows);
      if (chunkErr) throw new Error(chunkErr.message);

      await supabase.from("documents").update({ status: "ready", chunk_count: chunks.length }).eq("id", doc.id);
      return { id: doc.id, chunks: chunks.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await supabase.from("documents").update({ status: "failed", error: msg }).eq("id", doc.id);
      throw new Error(msg);
    }
  });

// ---- Conversations & messages ----

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("conversations").select("id,title,updated_at").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: msgs, error } = await context.supabase
      .from("messages")
      .select("id,role,content,citations,created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return msgs ?? [];
  });

export const askQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId?: string | null; question: string }) =>
    z.object({
      conversationId: z.string().uuid().nullable().optional(),
      question: z.string().min(1).max(4000),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // 1. conversation
    let convId = data.conversationId ?? null;
    if (!convId) {
      const title = data.question.slice(0, 60);
      const { data: c, error } = await supabase
        .from("conversations").insert({ user_id: userId, title }).select("id").single();
      if (error || !c) throw new Error(error?.message ?? "Failed to create conversation");
      convId = c.id;
    } else {
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    }

    // 2. save user message
    await supabase.from("messages").insert({
      conversation_id: convId, user_id: userId, role: "user", content: data.question,
    });

    // 3. embed query and retrieve
    const [queryVec] = await embed(data.question);
    const { data: matches, error: matchErr } = await supabase.rpc("match_document_chunks", {
      query_embedding: `[${queryVec.join(",")}]` as unknown as number[],
      match_count: 6,
    });
    if (matchErr) throw new Error(matchErr.message);

    type Match = { id: string; document_id: string; chunk_index: number; content: string; similarity: number };
    const chunks = (matches ?? []) as Match[];

    // 4. get document names
    const docIds = Array.from(new Set(chunks.map((c) => c.document_id)));
    const { data: docs } = docIds.length
      ? await supabase.from("documents").select("id,name").in("id", docIds)
      : { data: [] };
    const docMap = new Map((docs ?? []).map((d) => [d.id, d.name]));

    // 5. build context
    const context_text = chunks.map((c, i) =>
      `[${i + 1}] (from "${docMap.get(c.document_id) ?? "Document"}", chunk ${c.chunk_index})\n${c.content}`
    ).join("\n\n---\n\n");

    const systemPrompt = chunks.length
      ? `You are Syntax, a precise document assistant. Answer the user's question using ONLY the provided sources. Cite sources inline using [1], [2], etc. matching the numbered context blocks. If the answer is not in the sources, say so honestly. Be concise and use markdown.`
      : `You are Syntax, a document assistant. The user has no documents indexed yet or no relevant content was found. Politely tell them to upload documents first.`;

    const userMessage = chunks.length
      ? `Sources:\n\n${context_text}\n\n---\n\nQuestion: ${data.question}`
      : data.question;

    // 6. call AI
    const apiKey = process.env.LOVABLE_API_KEY!;
    const aiRes = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) throw new Error("Rate limit reached. Please try again shortly.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
      throw new Error(`AI request failed: ${t}`);
    }
    const aiData = await aiRes.json();
    const answer: string = aiData.choices?.[0]?.message?.content ?? "(no response)";

    const citations = chunks.map((c, i) => ({
      n: i + 1,
      document_id: c.document_id,
      document_name: docMap.get(c.document_id) ?? "Document",
      chunk_index: c.chunk_index,
      excerpt: c.content.slice(0, 320),
      similarity: c.similarity,
    }));

    // 7. save assistant message
    await supabase.from("messages").insert({
      conversation_id: convId, user_id: userId, role: "assistant",
      content: answer, citations,
    });

    return { conversationId: convId, answer, citations };
  });