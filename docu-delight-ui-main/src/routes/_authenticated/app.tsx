import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  FileText, Upload, Trash2, Plus, Send, Loader2, MessageSquare, LogOut, Sparkles, FileCheck2, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listDocuments, ingestDocument, deleteDocument,
  listConversations, getMessages, askQuestion,
} from "@/lib/rag.functions";
import { extractText } from "@/lib/extract-text";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Workspace — Syntax" }] }),
  component: AppPage,
});

type Citation = { n: number; document_id: string; document_name: string; chunk_index: number; excerpt: string; similarity: number };
type Message = { id?: string; role: "user" | "assistant"; content: string; citations?: Citation[] };

function AppPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listDocsFn = useServerFn(listDocuments);
  const ingestFn = useServerFn(ingestDocument);
  const deleteDocFn = useServerFn(deleteDocument);
  const listConvFn = useServerFn(listConversations);
  const getMsgsFn = useServerFn(getMessages);
  const askFn = useServerFn(askQuestion);

  const docs = useQuery({ queryKey: ["docs"], queryFn: () => listDocsFn() });
  const convs = useQuery({ queryKey: ["convs"], queryFn: () => listConvFn() });

  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  useEffect(() => {
    if (!convId) { setMessages([]); setActiveCitations([]); return; }
    getMsgsFn({ data: { conversationId: convId } }).then((rows) => {
      const ms = rows.map((r) => ({
        id: r.id, role: r.role as "user" | "assistant", content: r.content,
        citations: (r.citations as Citation[] | null) ?? [],
      }));
      setMessages(ms);
      const lastAssist = [...ms].reverse().find((m) => m.role === "assistant");
      setActiveCitations(lastAssist?.citations ?? []);
    });
  }, [convId, getMsgsFn]);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const text = await extractText(file);
      if (!text.trim()) throw new Error("Could not extract text from this file");
      return await ingestFn({ data: { name: file.name, mime: file.type || "text/plain", size: file.size, text } });
    },
    onSuccess: () => { toast.success("Document indexed"); qc.invalidateQueries({ queryKey: ["docs"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const ask = useMutation({
    mutationFn: async (question: string) => askFn({ data: { conversationId: convId, question } }),
    onMutate: (q) => {
      setMessages((m) => [...m, { role: "user", content: q }]);
      setThinking(true);
    },
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: "assistant", content: res.answer, citations: res.citations }]);
      setActiveCitations(res.citations);
      if (!convId) setConvId(res.conversationId);
      qc.invalidateQueries({ queryKey: ["convs"] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to get answer");
      setMessages((m) => m.slice(0, -1));
    },
    onSettled: () => setThinking(false),
  });

  async function handleSignOut() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/auth", replace: true });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || thinking) return;
    setInput("");
    ask.mutate(q);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((f) => upload.mutate(f));
    e.target.value = "";
  }

  return (
    <div className="h-screen flex bg-muted/30 text-foreground">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border bg-card flex flex-col">
        <div className="px-5 h-16 flex items-center border-b border-border gap-2">
          <div className="size-6 bg-primary rounded-sm" />
          <span className="font-bold tracking-tight">SYNTAX</span>
        </div>

        <div className="p-4 border-b border-border space-y-2">
          <button
            onClick={() => fileInput.current?.click()}
            disabled={upload.isPending}
            className="w-full bg-primary text-primary-foreground p-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {upload.isPending ? "Indexing…" : "Upload document"}
          </button>
          <input
            ref={fileInput} type="file" hidden multiple
            accept=".pdf,.txt,.md,.markdown,.csv,.json,application/pdf,text/plain"
            onChange={onFileChange}
          />
          <button
            onClick={() => { setConvId(null); setMessages([]); setActiveCitations([]); }}
            className="w-full border border-border p-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:bg-muted"
          >
            <Plus className="size-4" /> New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Documents ({docs.data?.length ?? 0})</div>
            <div className="space-y-1">
              {docs.isLoading && <div className="text-xs text-muted-foreground p-2">Loading…</div>}
              {docs.data?.length === 0 && <div className="text-xs text-muted-foreground p-2">No documents yet.</div>}
              {docs.data?.map((d) => (
                <div key={d.id} className="group flex items-center gap-2 p-2 rounded text-sm hover:bg-muted">
                  {d.status === "ready" ? <FileCheck2 className="size-3.5 text-accent shrink-0" /> :
                    d.status === "failed" ? <AlertCircle className="size-3.5 text-destructive shrink-0" /> :
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0" />}
                  <span className="truncate flex-1" title={d.name}>{d.name}</span>
                  <button onClick={() => { deleteDocFn({ data: { id: d.id } }).then(() => qc.invalidateQueries({ queryKey: ["docs"] })); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Conversations</div>
            <div className="space-y-1">
              {convs.data?.length === 0 && <div className="text-xs text-muted-foreground p-2">No conversations yet.</div>}
              {convs.data?.map((c) => (
                <button key={c.id} onClick={() => setConvId(c.id)}
                  className={`w-full text-left flex items-center gap-2 p-2 rounded text-sm hover:bg-muted ${convId === c.id ? "bg-muted font-medium" : ""}`}>
                  <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-border">
          <button onClick={handleSignOut} className="w-full flex items-center gap-2 p-2 rounded text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Chat */}
      <main className="flex-1 flex flex-col bg-card">
        <div className="h-16 border-b border-border px-6 flex items-center">
          <h1 className="font-semibold text-sm">Ask your documents</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
          {messages.length === 0 && !thinking && (
            <div className="max-w-2xl mx-auto text-center py-16">
              <div className="inline-flex size-12 items-center justify-center rounded-xl bg-accent/10 mb-4">
                <Sparkles className="size-6 text-accent" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">What do you want to know?</h2>
              <p className="text-muted-foreground mb-8">Upload a document, then ask anything. Answers come with citations to the exact passage.</p>
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto text-left">
                {["Summarize the key points", "What are the main risks?", "List action items", "Compare across documents"].map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="p-3 border border-border rounded-lg text-sm hover:bg-muted text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} m={m} onCitationClick={(c) => setActiveCitations(m.citations ?? [c])} />
          ))}

          {thinking && (
            <div className="flex gap-4">
              <div className="size-8 rounded bg-primary shrink-0 flex items-center justify-center text-primary-foreground text-[10px] font-bold">S</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1.5">
                <Loader2 className="size-3.5 animate-spin" /> Searching your documents…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-6 border-t border-border">
          <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your documents anything…"
              className="w-full border border-border bg-background rounded-lg py-3.5 pl-4 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
            <button type="submit" disabled={!input.trim() || thinking}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-md bg-primary text-primary-foreground grid place-items-center disabled:opacity-40 hover:opacity-90">
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Sources */}
      <aside className="w-80 border-l border-border bg-card flex flex-col">
        <div className="h-16 px-5 flex items-center border-b border-border">
          <h2 className="font-semibold text-sm">Sources</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{activeCitations.length} cited</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeCitations.length === 0 && (
            <div className="text-xs text-muted-foreground p-2">Source passages will appear here as you chat.</div>
          )}
          {activeCitations.map((c) => (
            <div key={`${c.document_id}-${c.chunk_index}`} className="p-3 border border-border bg-muted/40 rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-accent">[{c.n}]</span>
                <span className="text-[10px] text-muted-foreground font-mono">{Math.round(c.similarity * 100)}% match</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium truncate">
                <FileText className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate" title={c.document_name}>{c.document_name}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">"{c.excerpt}…"</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function MessageBubble({ m, onCitationClick }: { m: Message; onCitationClick: (c: Citation) => void }) {
  if (m.role === "user") {
    return (
      <div className="flex gap-4 max-w-3xl">
        <div className="size-8 rounded bg-muted shrink-0 border border-border" />
        <div className="bg-muted p-4 rounded-2xl rounded-tl-none text-sm">{m.content}</div>
      </div>
    );
  }
  // assistant — render markdown, transform [n] citations into clickable badges
  const parts = m.content.split(/(\[\d+\])/g);
  return (
    <div className="flex gap-4 max-w-3xl">
      <div className="size-8 rounded bg-primary shrink-0 flex items-center justify-center text-primary-foreground text-[10px] font-bold">S</div>
      <div className="text-sm prose prose-sm max-w-none prose-p:my-2 prose-headings:font-semibold prose-li:my-0">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p>{processCitations(children, m.citations ?? [], onCitationClick)}</p>,
            li: ({ children }) => <li>{processCitations(children, m.citations ?? [], onCitationClick)}</li>,
          }}
        >
          {m.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function processCitations(children: React.ReactNode, citations: Citation[], onClick: (c: Citation) => void): React.ReactNode {
  return (Array.isArray(children) ? children : [children]).flatMap((child, idx) => {
    if (typeof child !== "string") return [<span key={idx}>{child}</span>];
    return child.split(/(\[\d+\])/g).map((part, i) => {
      const m = part.match(/^\[(\d+)\]$/);
      if (m) {
        const n = parseInt(m[1], 10);
        const cit = citations.find((c) => c.n === n);
        return (
          <button key={`${idx}-${i}`}
            onClick={() => cit && onClick(cit)}
            className="text-accent bg-accent/10 px-1 rounded text-[11px] font-mono mx-0.5 hover:bg-accent/20 cursor-pointer">
            [{n}]
          </button>
        );
      }
      return <span key={`${idx}-${i}`}>{part}</span>;
    });
  });
}