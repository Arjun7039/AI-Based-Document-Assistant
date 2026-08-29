import React, { useMemo } from 'react'
import { HiOutlineDocumentText, HiOutlineArrowLeft, HiOutlineXMark } from 'react-icons/hi2'
import useStore from '../store/useStore'

export default function SourcePanel() {
  const { sources, closeSourcePanel } = useStore()

  const groupedCitations = useMemo(() => {
    if (!Array.isArray(sources) || sources.length === 0) return []
    try {
      const groups = {}
      sources.forEach((s) => {
        if (!s || typeof s !== 'object') return
        const fn = s.filename || s.document_id || 'Unknown Document'
        const p = s.page != null ? String(s.page) : ''
        const text = s.chunk || s.text || s.excerpt || ''
        const score = s.score || s.similarity || 0

        if (!groups[fn]) {
          groups[fn] = { filename: fn, pages: new Set(), excerpts: [], maxScore: 0 }
        }

        const clean = p.trim()
        if (clean && clean !== 'Unknown' && clean !== '?' && clean !== '0') {
          groups[fn].pages.add(clean.endsWith('.0') ? clean.slice(0, -2) : clean)
        }
        if (text) groups[fn].excerpts.push(text)
        if (score > groups[fn].maxScore) groups[fn].maxScore = score
      })

      return Object.values(groups).map((g) => ({
        filename: g.filename,
        pages: Array.from(g.pages).sort((a, b) => {
          const na = parseFloat(a), nb = parseFloat(b)
          return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b)
        }),
        excerpts: g.excerpts.slice(0, 3),
        score: g.maxScore,
      }))
    } catch { return [] }
  }, [sources])

  return (
    <aside className="
      fixed inset-0 z-50
      lg:relative lg:inset-auto lg:z-auto
      w-full lg:w-96
      border-l border-slate-200/80 bg-white
      flex flex-col shrink-0
      shadow-lift lg:shadow-none
      animate-slide-in-right
    ">
      {/* Header */}
      <div className="h-14 sm:h-16 px-3 sm:px-4 flex items-center border-b border-slate-200/80 shrink-0 gap-2 bg-white/80 backdrop-blur-sm">
        <button onClick={closeSourcePanel} aria-label="Close sources" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95">
          <HiOutlineXMark className="w-5 h-5 lg:hidden" />
          <HiOutlineArrowLeft className="w-5 h-5 hidden lg:block" />
        </button>
        <div>
          <h2 className="font-bold text-sm text-slate-900 leading-tight">Sources</h2>
          <p className="text-[11px] text-slate-400 font-medium">{groupedCitations.length} document{groupedCitations.length !== 1 ? 's' : ''} cited</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-slate-50/40">
        {groupedCitations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 leading-relaxed mt-4">
            Source passages will appear here as you chat.
          </div>
        ) : (
          groupedCitations.map((c, i) => (
            <div key={i} className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft space-y-2.5 animate-pop">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  [{i + 1}]
                </span>
                {c.score > 0 && (
                  <span className="text-[11px] text-slate-400 font-mono font-semibold">
                    {Math.round(c.score * 100)}% match
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 min-w-0">
                <div className="w-7 h-7 shrink-0 rounded-lg bg-slate-100 border border-slate-200 grid place-items-center">
                  <HiOutlineDocumentText className="w-4 h-4 text-slate-500" />
                </div>
                <span className="truncate" title={c.filename}>{c.filename}</span>
              </div>

              {c.pages.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {c.pages.map((pg) => (
                    <span key={pg} className="px-2 py-0.5 rounded-md bg-indigo-50/70 border border-indigo-100 text-indigo-600 text-[10px] font-extrabold uppercase tracking-wide">
                      Page {pg}
                    </span>
                  ))}
                </div>
              )}

              {c.excerpts.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-2.5">
                  {c.excerpts.map((exc, idx) => (
                    <p key={idx} className="text-xs text-slate-500 leading-relaxed italic border-l-2 border-indigo-200 pl-2.5">
                      "{exc.slice(0, 150)}…"
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
