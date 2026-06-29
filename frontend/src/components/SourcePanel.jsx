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
        const text = s.text || s.excerpt || ''
        const score = s.score || s.similarity || 0

        if (!groups[fn]) {
          groups[fn] = {
            filename: fn,
            pages: new Set(),
            excerpts: [],
            maxScore: 0
          }
        }
        
        const clean = p.trim()
        if (clean && clean !== 'Unknown' && clean !== '?' && clean !== '0') {
          groups[fn].pages.add(clean.endsWith('.0') ? clean.slice(0, -2) : clean)
        }
        
        if (text) {
          groups[fn].excerpts.push(text)
        }
        if (score > groups[fn].maxScore) {
          groups[fn].maxScore = score
        }
      })

      return Object.values(groups).map((g) => ({
        filename: g.filename,
        pages: Array.from(g.pages).sort((a, b) => {
          const na = parseFloat(a), nb = parseFloat(b)
          return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b)
        }),
        excerpts: g.excerpts.slice(0, 3), // max 3 excerpts
        score: g.maxScore
      }))
    } catch { return [] }
  }, [sources])

  return (
    <aside className="
      fixed inset-0 z-50
      lg:relative lg:inset-auto lg:z-auto
      w-full lg:w-96
      border-l border-slate-200 bg-white
      flex flex-col shrink-0
      animate-slide-in-right
    ">
      {/* Header */}
      <div className="h-14 sm:h-16 px-4 sm:px-5 flex items-center border-b border-slate-200 shrink-0 gap-2">
        {/* Desktop: back arrow. Mobile: X button */}
        <button onClick={closeSourcePanel} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all hidden lg:block">
          <HiOutlineArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={closeSourcePanel} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all lg:hidden">
          <HiOutlineXMark className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-sm text-slate-900">Sources</h2>
        <span className="ml-auto text-xs font-mono text-slate-500 font-bold">{groupedCitations.length} cited</span>
      </div>

      {/* Body Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4 no-scrollbar">
        {groupedCitations.length === 0 ? (
          <div className="text-xs text-slate-400 p-2">Source passages will appear here as you chat.</div>
        ) : (
          groupedCitations.map((c, i) => (
            <div key={i} className="p-3 sm:p-4 border border-slate-200 bg-slate-50/40 rounded-2xl space-y-2.5 sm:space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                  [{i + 1}]
                </span>
                {c.score > 0 && (
                  <span className="text-xs text-slate-500 font-mono">
                    {Math.round(c.score * 100)}% match
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 truncate">
                <HiOutlineDocumentText className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="truncate" title={c.filename}>{c.filename}</span>
              </div>
              
              {c.pages.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {c.pages.map((pg) => (
                    <span key={pg} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 text-[10px] font-bold">
                      Page {pg}
                    </span>
                  ))}
                </div>
              )}

              {c.excerpts.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-2.5 sm:pt-3">
                  {c.excerpts.map((exc, idx) => (
                    <p key={idx} className="text-xs text-slate-500 leading-relaxed italic border-l-2 border-slate-200 pl-2">
                      "{exc.slice(0, 150)}..."
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
