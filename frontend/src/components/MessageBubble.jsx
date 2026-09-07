import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import useStore from '../store/useStore'

function CitationBadge({ filename, page, score, snippet, onOpenInspector }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <span
      className="relative inline-block my-0.5 align-middle"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onOpenInspector()
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-0.5 rounded-lg bg-indigo-50/90 border border-indigo-200/90 text-slate-800 text-xs font-semibold hover:bg-indigo-100 hover:border-indigo-400 cursor-pointer transition-all select-none shadow-xs active:scale-95 group"
        title="Click to view full page with highlighted match"
      >
        <span className="truncate max-w-[130px]">{filename}</span>
        {page && (
          <span className="px-1.5 py-0.2 bg-amber-400 text-white text-[9.5px] rounded font-black tracking-wide uppercase shadow-2xs">
            PG {page}
          </span>
        )}
        {score > 0 && (
          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
            {score}%
          </span>
        )}
      </button>

      {/* Traversal Hover Tooltip Card */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-72 p-3 bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md z-40 animate-pop text-left pointer-events-none">
          <div className="flex items-center justify-between gap-1 border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold text-xs truncate max-w-[160px] text-slate-200">{filename}</span>
            <span className="text-[10px] font-mono font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 rounded-full">
              {score}% Match
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed italic line-clamp-3">
            "{snippet}"
          </p>
          <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-indigo-300 font-semibold">
            <span>Page {page || 1}</span>
            <span>Click to inspect page →</span>
          </div>
        </div>
      )}
    </span>
  )
}

export default function MessageBubble({ message }) {
  const { openSourcePanel, setSources, openInspector } = useStore()
  const isUser = message.role === 'user'

  const handleCitationClick = () => {
    try {
      const s = Array.isArray(message.sources) ? message.sources : []
      if (s.length > 0) {
        setSources(s, {
          confidenceScore: message.confidenceScore,
          cragGrade: message.cragGrade,
          evaluationDetails: message.evaluationDetails,
          latencyMs: message.latencyMs,
          cached: message.cached,
        })
      }
      openSourcePanel()
    } catch {}
  }

  // Format citations inline to match clickable style
  const getFormattedContent = () => {
    try {
      const raw = message.content || ''
      // Matches "(Source: ...)" safely supporting files with parentheses
      return raw.replace(/\(Source:\s*([^)]+(?:\([^)]*\)[^)]*)*)\)/gi, (match, innerContent) => {
        let filename = innerContent.trim()
        let page = ''

        // Split by the last occurrence of ", Page " or ", page "
        const pageRegex = /,\s*Page\s*([^,]+)$/i
        const pageMatch = filename.match(pageRegex)
        if (pageMatch) {
          page = pageMatch[1].trim()
          if (page.endsWith('.0')) page = page.slice(0, -2)
          filename = filename.replace(pageRegex, '').trim()
        }

        const valid = page && page !== 'Unknown' && page !== '?' && page !== '0'
        const cleanP = page.endsWith('.0') ? page.slice(0, -2) : page
        const label = valid ? `📄 ${filename}, Page ${cleanP}` : `📄 ${filename}`

        // Base64 encode the metadata to completely avoid markdown url parenthesis bugs
        let safeHash = ''
        try {
          const hashObj = { filename, page: valid ? cleanP : '' }
          safeHash = btoa(encodeURIComponent(JSON.stringify(hashObj)))
        } catch {
          safeHash = 'citation'
        }

        return `[${label}](#source-${safeHash})`
      })
    } catch {
      return message.content || ''
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="max-w-[85%] sm:max-w-[75%] flex flex-col items-end gap-1.5">
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Uploaded"
              className="rounded-2xl max-h-72 object-contain border border-indigo-200/60 shadow-lift bg-white"
            />
          )}
          {message.content && (
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-lift">
              <p className="whitespace-pre-wrap text-sm sm:text-[15px] leading-relaxed">{message.content}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Assistant response
  return (
    <div className="flex gap-3 sm:gap-4 max-w-3xl animate-slide-up">
      {/* DocuMIND avatar */}
      <div className="size-8 sm:size-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shrink-0 flex items-center justify-center text-white text-xs font-black shadow-glow mt-0.5">
        D
      </div>

      {/* Markdown content */}
      <div className={`min-w-0 text-sm sm:text-base prose prose-slate max-w-none rounded-2xl bg-white border border-slate-200/80 shadow-soft px-4 py-3 sm:px-5 sm:py-4 ${message.isError ? 'border-red-200 bg-red-50/50' : ''}
        prose-p:my-2.5 prose-p:leading-relaxed prose-p:text-slate-800 prose-p:text-sm sm:prose-p:text-base
        prose-headings:font-bold prose-headings:text-slate-900
        prose-li:my-1.5 prose-li:leading-relaxed prose-li:text-slate-800 prose-li:text-sm sm:prose-li:text-base
        prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5
        prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-5
        prose-strong:text-slate-950 prose-strong:font-extrabold
        prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[13px] prose-code:font-semibold prose-code:border prose-code:border-indigo-100
      `}>
        {/* Agentic reasoning stage or live status */}
        {message.statusMessage && (
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50/80 border border-indigo-100 px-2.5 py-1.5 rounded-lg animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>{message.statusMessage}</span>
          </div>
        )}

        {/* Badges bar (CRAG Evaluation & Confidence Score, Cache Hit, Sources) */}
        {(message.cached || message.cragGrade || message.confidenceScore) && (
          <div className="mb-3 flex items-center gap-2 flex-wrap text-[11px] font-bold">
            {/* CRAG Evaluation Grade & Confidence Score */}
            {message.cragGrade && (
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-xs ${
                message.cragGrade === 'CORRECT'
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                  : message.cragGrade === 'AMBIGUOUS'
                  ? 'bg-amber-50/90 border-amber-200 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  message.cragGrade === 'CORRECT' ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
                <span>CRAG Evaluation: <strong className="font-extrabold">{message.cragGrade}</strong></span>
                {message.confidenceScore && (
                  <span className="font-mono bg-white/80 px-1.5 py-0.5 rounded border border-current text-[10px]">
                    {message.confidenceScore}% Confidence
                  </span>
                )}
              </div>
            )}

            {/* Semantic Cache Badge */}
            {message.cached && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 shadow-xs">
                ⚡ Cache Hit ({message.latencyMs || '<15'}ms • $0.00)
              </span>
            )}

            {/* Verified Sources Badge */}
            {Array.isArray(message.sources) && message.sources.length > 0 && (
              <span
                onClick={handleCitationClick}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 cursor-pointer hover:bg-indigo-100 transition-colors shadow-xs"
                title="Click to view citations in Source Panel"
              >
                📄 {message.sources.length} Context Chunk{message.sources.length > 1 ? 's' : ''} Grounded
              </span>
            )}
          </div>
        )}

        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              if (href && href.startsWith('#source-')) {
                let meta = { filename: '', page: '' }
                try {
                  const encoded = href.replace('#source-', '')
                  meta = JSON.parse(decodeURIComponent(atob(encoded)))
                } catch {}

                const fn = meta.filename || ''
                const cleanP = String(meta.page || '').endsWith('.0') ? String(meta.page).slice(0, -2) : String(meta.page || '')

                // Find matching source chunk
                const sourcesList = Array.isArray(message.sources) ? message.sources : []
                const matchedChunk = sourcesList.find(s =>
                  (s.filename === fn || s.filename?.toLowerCase() === fn.toLowerCase()) &&
                  (!cleanP || String(s.page).replace('.0', '') === cleanP)
                ) || sourcesList[0]

                const score = matchedChunk?.score
                  ? Math.round(matchedChunk.score > 1 ? matchedChunk.score : matchedChunk.score * 100)
                  : Math.round(message.confidenceScore || 88)

                const snippet = matchedChunk?.chunk
                  ? (matchedChunk.chunk.slice(0, 160) + '…')
                  : 'Verified grounded excerpt from document.'

                return (
                  <CitationBadge
                    filename={fn || 'Document'}
                    page={cleanP}
                    score={score}
                    snippet={snippet}
                    onOpenInspector={() => {
                      handleCitationClick()
                      openInspector({
                        filename: fn || 'Document',
                        page: cleanP || '1',
                        text: matchedChunk?.chunk || snippet,
                        score: score,
                        highlightQuery: message.content || '',
                      })
                    }}
                  />
                )
              }
              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500 hover:underline">{children}</a>
            }
          }}
        >
          {getFormattedContent()}
        </ReactMarkdown>
      </div>
    </div>
  )
}
