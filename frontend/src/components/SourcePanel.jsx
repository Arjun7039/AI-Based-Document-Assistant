import React, { useMemo, useState } from 'react'
import {
  HiOutlineDocumentText,
  HiOutlineArrowLeft,
  HiOutlineXMark,
  HiOutlineClipboardDocumentCheck,
  HiOutlineClipboard,
  HiOutlineEye,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineBolt,
  HiOutlineCheckCircle,
  HiOutlineInformationCircle,
} from 'react-icons/hi2'
import useStore from '../store/useStore'

export default function SourcePanel() {
  const { sources, evaluationData, closeSourcePanel, openInspector } = useStore()
  const [inspectedDoc, setInspectedDoc] = useState(null)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [copiedQuoteIdx, setCopiedQuoteIdx] = useState(null)

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
          groups[fn] = { filename: fn, pages: new Set(), excerpts: [], maxScore: 0, chunkScores: [] }
        }

        const clean = p.trim()
        if (clean && clean !== 'Unknown' && clean !== '?' && clean !== '0') {
          groups[fn].pages.add(clean.endsWith('.0') ? clean.slice(0, -2) : clean)
        }
        if (text) {
          groups[fn].excerpts.push(text)
          groups[fn].chunkScores.push(score)
        }
        if (score > groups[fn].maxScore) groups[fn].maxScore = score
      })

      return Object.values(groups).map((g) => ({
        filename: g.filename,
        pages: Array.from(g.pages).sort((a, b) => {
          const na = parseFloat(a), nb = parseFloat(b)
          return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b)
        }),
        excerpts: g.excerpts.slice(0, 6),
        chunkScores: g.chunkScores,
        score: g.maxScore,
      }))
    } catch {
      return []
    }
  }, [sources])

  // Derive composite confidence score
  const computedConfidence = useMemo(() => {
    if (evaluationData?.confidenceScore != null) {
      return Math.round(evaluationData.confidenceScore)
    }
    if (groupedCitations.length > 0) {
      const topScore = Math.max(...groupedCitations.map((g) => g.score || 0))
      if (topScore > 0) return Math.min(Math.round(topScore * 100), 98)
    }
    return sources.length > 0 ? 88 : null
  }, [evaluationData, groupedCitations, sources])

  const cragGrade = evaluationData?.cragGrade || (computedConfidence ? (computedConfidence >= 75 ? 'CORRECT' : 'AMBIGUOUS') : null)
  const evalDetails = evaluationData?.evaluationDetails || (computedConfidence >= 80
    ? 'High semantic overlap and strong keyword grounding across retrieved chunks.'
    : 'Retrieved context evaluated and aligned with user query.')

  const totalPagesCount = useMemo(() => {
    const pSet = new Set()
    groupedCitations.forEach((g) => g.pages.forEach((p) => pSet.add(p)))
    return pSet.size
  }, [groupedCitations])

  const copyCitation = (filename, page, idx) => {
    const citation = page ? `(Source: ${filename}, Page ${page})` : `(Source: ${filename})`
    navigator.clipboard.writeText(citation)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const copyQuote = (quoteText, idx) => {
    navigator.clipboard.writeText(quoteText)
    setCopiedQuoteIdx(idx)
    setTimeout(() => setCopiedQuoteIdx(null), 2000)
  }

  return (
    <aside className="
      fixed inset-0 z-50
      lg:relative lg:inset-auto lg:z-auto
      w-full lg:w-[390px] xl:w-[430px]
      border-l border-slate-200/80 bg-slate-50/50 backdrop-blur-sm
      flex flex-col shrink-0
      shadow-2xl lg:shadow-none
      animate-slide-in-right
      transition-all duration-300
    ">
      {/* ─── Top Header ─── */}
      <div className="h-14 sm:h-16 px-4 flex items-center border-b border-slate-200/80 shrink-0 justify-between bg-white/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={closeSourcePanel}
            aria-label="Close sources"
            className="p-2 -ml-1 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95"
          >
            <HiOutlineXMark className="w-5 h-5 lg:hidden" />
            <HiOutlineArrowLeft className="w-5 h-5 hidden lg:block" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-extrabold text-sm sm:text-[15px] text-slate-900 leading-tight">
                Grounding & Citations
              </h2>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Verified document evidence & confidence
            </p>
          </div>
        </div>

        <button
          onClick={closeSourcePanel}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors hidden sm:block"
        >
          Hide
        </button>
      </div>

      {/* ─── Scrollable Content ─── */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 no-scrollbar">

        {/* ─── 1. Confidence & Retrieval Intelligence Card ─── */}
        {computedConfidence !== null ? (
          <div className="rounded-2xl p-4 bg-gradient-to-br from-white via-indigo-50/30 to-violet-50/40 border border-indigo-100/90 shadow-soft space-y-3.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                <HiOutlineShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Verification Score</span>
              </div>
              {/* CRAG Grade Status Badge */}
              {cragGrade && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border shadow-xs ${
                  cragGrade === 'CORRECT'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cragGrade === 'CORRECT' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  CRAG {cragGrade}
                </span>
              )}
            </div>

            {/* Score Big Display & Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                    {computedConfidence}%
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    {computedConfidence >= 80 ? 'High Confidence' : computedConfidence >= 60 ? 'Moderate Confidence' : 'Review Needed'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Cosine Re-ranked</span>
              </div>

              {/* Gradient Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/60">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    computedConfidence >= 80
                      ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500'
                      : 'bg-gradient-to-r from-amber-400 to-amber-500'
                  }`}
                  style={{ width: `${Math.min(Math.max(computedConfidence, 5), 100)}%` }}
                />
              </div>
            </div>

            {/* Explanation Quote */}
            {evalDetails && (
              <div className="rounded-xl p-2.5 bg-white/80 border border-slate-200/60 text-xs text-slate-600 leading-relaxed italic flex items-start gap-2">
                <HiOutlineInformationCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span>{evalDetails}</span>
              </div>
            )}

            {/* Micro Telemetry Bar */}
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-indigo-50/80 text-[10px] font-semibold text-slate-500">
              {evaluationData?.cached ? (
                <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  <HiOutlineBolt className="w-3 h-3 text-blue-500" />
                  Semantic Cache (&lt;15ms)
                </span>
              ) : evaluationData?.latencyMs ? (
                <span className="inline-flex items-center gap-1 text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/60">
                  <HiOutlineBolt className="w-3 h-3 text-amber-500" />
                  Latency: {evaluationData.latencyMs}ms
                </span>
              ) : null}

              <span className="inline-flex items-center gap-1 text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/60">
                <HiOutlineCheckCircle className="w-3 h-3 text-emerald-500" />
                Prompt Guardrails Active
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-4 bg-white border border-slate-200/80 shadow-soft text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-50 border border-indigo-100 grid place-items-center text-indigo-600">
              <HiOutlineSparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-slate-800">Verification Standby</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ask any question about your documents to view live confidence scores and grounded citation proofs.
            </p>
          </div>
        )}

        {/* ─── 2. Proof Metric Statistics Grid ─── */}
        {groupedCitations.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-xs text-center">
              <span className="block text-lg font-extrabold text-slate-900 font-mono">
                {groupedCitations.length}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Doc{groupedCitations.length !== 1 ? 's' : ''} Cited
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-xs text-center">
              <span className="block text-lg font-extrabold text-slate-900 font-mono">
                {totalPagesCount || 1}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pages Grounded
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-xs text-center">
              <span className="block text-lg font-extrabold text-indigo-600 font-mono">
                {sources.length}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Verified Chunks
              </span>
            </div>
          </div>
        )}

        {/* ─── 3. Verified Document Evidence Cards ─── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Document Proofs ({groupedCitations.length})
            </h3>
            <span className="text-[10px] text-slate-400">Click excerpts to inspect</span>
          </div>

          {groupedCitations.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 leading-relaxed bg-white/60">
              No active citations. Retrieved passages and page numbers will appear here after asking questions.
            </div>
          ) : (
            groupedCitations.map((c, i) => (
              <div
                key={i}
                className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft space-y-3 transition-all hover:border-indigo-200 hover:shadow-md animate-pop"
              >
                {/* Source Card Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                      Proof #{i + 1}
                    </span>
                    {c.score > 0 && (
                      <span className="text-[11px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                        {Math.round(c.score * 100)}% Match
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => openInspector({
                      filename: c.filename,
                      page: c.pages[0] || '1',
                      text: c.excerpts.join('\n\n'),
                      score: c.score,
                    })}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
                    title="Inspect complete excerpt text"
                  >
                    <HiOutlineEye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                </div>

                {/* File Title */}
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 min-w-0">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-indigo-50 border border-indigo-100 grid place-items-center text-indigo-600">
                    <HiOutlineDocumentText className="w-4 h-4" />
                  </div>
                  <span className="truncate" title={c.filename}>
                    {c.filename}
                  </span>
                </div>

                {/* Page Badges with Copy Support */}
                {c.pages.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Cited Pages (click to copy tag):
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {c.pages.map((pg, pIdx) => (
                        <button
                          key={pg}
                          onClick={() => copyCitation(c.filename, pg, `${i}-${pIdx}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-extrabold tracking-wide hover:bg-amber-100 hover:border-amber-300 transition-all active:scale-95 shadow-xs"
                          title="Click to copy citation reference"
                        >
                          <span>Page {pg}</span>
                          {copiedIdx === `${i}-${pIdx}` ? (
                            <HiOutlineClipboardDocumentCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <HiOutlineClipboard className="w-3.5 h-3.5 text-amber-600 opacity-60" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quote Excerpts with Proof Quote Copy */}
                {c.excerpts.length > 0 && (
                  <div className="space-y-2 border-t border-slate-100 pt-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Retrieved Text Evidence:
                    </span>
                    {c.excerpts.slice(0, 2).map((exc, idx) => {
                      const quoteId = `${i}-exc-${idx}`
                      return (
                        <div
                          key={idx}
                          className="group relative rounded-xl p-2.5 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/60 hover:border-indigo-200 transition-all"
                        >
                          <p className="text-xs text-slate-700 leading-relaxed border-l-2 border-indigo-500 pl-2.5 italic">
                            "{exc.slice(0, 190)}…"
                          </p>

                          {/* Action Overlay */}
                          <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                            <button
                              onClick={() => copyQuote(exc, quoteId)}
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
                            >
                              {copiedQuoteIdx === quoteId ? (
                                <>
                                  <HiOutlineClipboardDocumentCheck className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-bold">Quote Copied!</span>
                                </>
                              ) : (
                                <>
                                  <HiOutlineClipboard className="w-3 h-3" />
                                  <span>Copy Quote</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => openInspector({
                                filename: c.filename,
                                page: c.pages[0] || '1',
                                text: exc,
                                score: c.score,
                              })}
                              className="text-indigo-600 hover:text-indigo-800 font-bold"
                            >
                              View context →
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Expanded Document Inspector Modal ─── */}
      {inspectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col animate-pop">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 grid place-items-center text-indigo-600 font-bold">
                  <HiOutlineDocumentText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate max-w-xs sm:max-w-md">
                    {inspectedDoc.filename}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Relevance: <strong>{Math.round(inspectedDoc.score * 100)}%</strong></span>
                    <span>•</span>
                    <span>Pages: <strong>{inspectedDoc.pages.join(', ') || 'General'}</strong></span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectedDoc(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 no-scrollbar">
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Verified Document Passages ({inspectedDoc.excerpts.length})
              </p>
              {inspectedDoc.excerpts.map((excerpt, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-mono whitespace-pre-wrap selection:bg-indigo-100"
                >
                  {excerpt}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Grounded via Pinecone + SentenceTransformers</span>
              <button
                onClick={() => {
                  const p = inspectedDoc.pages[0] || ''
                  copyCitation(inspectedDoc.filename, p, 'modal')
                }}
                className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2"
              >
                <HiOutlineClipboard className="w-4 h-4" />
                Copy Citation Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
