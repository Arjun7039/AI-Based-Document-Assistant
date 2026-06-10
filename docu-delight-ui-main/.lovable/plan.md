
# RAG Document Assistant — Build Plan

A modern, professional web app where users sign in, upload documents, and chat with an AI that answers using their own document content (Retrieval-Augmented Generation) with citations.

## Flow

1. **Pick the design first.** I'll generate 3 distinct rendered design directions (modern/stylish/professional, varying in composition and energy). You pick one, then I build the whole app in that direction.
2. **Enable Lovable Cloud** (database, auth, storage, AI gateway) — required for documents, embeddings, and chat.
3. **Build all pages and the RAG pipeline** end-to-end.

## Pages

- `/` — Landing (hero, features, how-it-works, CTA)
- `/auth` — Sign in / Sign up (email+password and Google)
- `/_authenticated/app` — Main workspace: document list (left), chat (right)
- `/_authenticated/documents` — Upload, list, delete documents; per-doc status (processing → ready)
- `/_authenticated/settings` — Profile + sign out

## Auth

- Email/password (Lovable Cloud)
- Google sign-in (via Lovable broker + `configure_social_auth`)
- `profiles` table auto-created on signup (display name, avatar)
- Protected routes under `src/routes/_authenticated/`

## RAG Pipeline

1. **Upload** — PDF / TXT / MD / DOCX to Cloud Storage (private bucket, per-user folder)
2. **Parse + chunk** — server fn extracts text, splits into ~1000-char chunks with overlap
3. **Embed** — Lovable AI `google/gemini-embedding-001` → store vectors in `pgvector`
4. **Ask** — user question → embed query → similarity search top-k chunks → pass as context to `google/gemini-3-flash-preview` → stream answer with inline citations [1][2]
5. **Sources panel** — show which chunks/documents were used for each answer

## Database (Lovable Cloud / Supabase)

- `profiles` (id, display_name, avatar_url)
- `documents` (id, user_id, name, mime, size, status, created_at)
- `document_chunks` (id, document_id, user_id, content, embedding vector(3072), chunk_index)
- `conversations` (id, user_id, title, created_at)
- `messages` (id, conversation_id, role, content, citations jsonb, created_at)
- pgvector extension + HNSW index
- RLS on every table scoped to `auth.uid()`; explicit GRANTs

## Server functions (TanStack `createServerFn`)

- `uploadDocument` → store + queue processing
- `processDocument` → parse, chunk, embed, insert
- `listDocuments` / `deleteDocument`
- `createConversation` / `listConversations` / `getConversation`
- `askQuestion` → embed query, vector search, call Lovable AI with retrieved context, persist messages
- Server route `/api/public/chat-stream` for SSE streaming of assistant tokens

## Design

- Modern, professional, stylish — exact tokens (colors, type, radius, motion) come from the chosen direction
- Semantic tokens in `src/styles.css` (oklch)
- Markdown rendering for AI responses (`react-markdown`)
- Toast notifications, loading skeletons, empty states

## Next step

After you approve this plan, I'll generate 3 design directions for you to pick from before writing any code.
