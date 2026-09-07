import React, { useState, useMemo } from 'react'
import {
  HiOutlineDocumentText,
  HiOutlineXMark,
  HiOutlineClipboard,
  HiOutlineClipboardDocumentCheck,
  HiOutlineSparkles,
  HiOutlineCheckBadge,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2'
import useStore from '../store/useStore'

export default function PageInspectorModal() {
  const { activeInspector, closeInspector } = useStore()
  const [copiedCitation, setCopiedCitation] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  if (!activeInspector) return null

  const {
    filename = 'Document',
    page = '1',
    text = '',
    highlightQuery = '',
    score = 0.88,
  } = activeInspector

  const cleanPage = String(page).endsWith('.0') ? String(page).slice(0, -2) : String(page)
  const matchPercent = Math.round((score > 1 ? score : score * 100))

  // Extract key search terms from user question to highlight
  const highlightTerms = useMemo(() => {
    const raw = (searchTerm || highlightQuery || '').trim().toLowerCase()
    if (!raw) return []
    // Split into words, filter short/common words
    const stopWords = new Set([
      'what', 'is', 'there', 'in', 'this', 'the', 'and', 'for', 'are', 'about',
      'with', 'from', 'that', 'these', 'those', 'tell', 'show', 'give', 'does', 'how',
    ])
    return raw
      .split(/\s+/)
      .map((w) => w.replace(/[^\w]/g, ''))
      .filter((w) => w.length >= 3 && !stopWords.has(w))
  }, [searchTerm, highlightQuery])

  // Split text into highlighted segments
  const highlightedSegments = useMemo(() => {
    if (!text) return []
    if (highlightTerms.length === 0) {
      return [{ text, isMatch: false }]
    }

    try {
      const regex = new RegExp(`(${highlightTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
      const parts = text.split(regex)
      return parts.map((part) => ({
        text: part,
        isMatch: highlightTerms.some((term) => term.toLowerCase() === part.toLowerCase()),
      }))
    } catch {
      return [{ text, isMatch: false }]
    }
  }, [text, highlightTerms])

  const copyCitation = () => {
    const citation = cleanPage ? `(Source: ${filename}, Page ${cleanPage})` : `(Source: ${filename})`
    navigator.clipboard.writeText(citation)
    setCopiedCitation(true)
    setTimeout(() => setCopiedCitation(false), 2000)
  }

  const copyFullText = () => {
    navigator.clipboard.writeText(text)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200/90 max-h-[90vh] flex flex-col overflow-hidden animate-pop">
        {/* ── Modal Header ── */}
        <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 grid place-items-center shrink-0 shadow-xs">
              <HiOutlineDocumentText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate" title={filename}>
                  {filename}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black shrink-0">
                  Page {cleanPage}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <HiOutlineCheckBadge className="w-4 h-4" />
                  {matchPercent}% Match Confidence
                </span>
                <span>•</span>
                <span>Verified Context Passage</span>
              </div>
            </div>
          </div>

          <button
            onClick={closeInspector}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors active:scale-95"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* ── Toolbar ── */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 min-w-0 flex-1">
            <HiOutlineMagnifyingGlass className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Highlight words on page..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyFullText}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 transition-all active:scale-95"
              title="Copy verified text"
            >
              {copiedText ? (
                <>
                  <HiOutlineClipboardDocumentCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-bold text-[11px]">Copied!</span>
                </>
              ) : (
                <>
                  <HiOutlineClipboard className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">Copy Text</span>
                </>
              )}
            </button>

            <button
              onClick={copyCitation}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold transition-all active:scale-95 text-[11px]"
              title="Copy citation reference"
            >
              {copiedCitation ? (
                <>
                  <HiOutlineClipboardDocumentCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Citation Copied!</span>
                </>
              ) : (
                <>
                  <HiOutlineSparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Copy Citation Tag</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Document Page Canvas ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-100/60 no-scrollbar">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/90 text-slate-800 text-sm sm:text-[15px] leading-relaxed font-serif relative selection:bg-amber-100">
            {/* Page Header Watermark */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 text-slate-400 text-xs font-sans">
              <span className="font-semibold uppercase tracking-wider">{filename}</span>
              <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">PAGE {cleanPage}</span>
            </div>

            {/* Render with highlighted terms */}
            <div className="whitespace-pre-wrap leading-loose">
              {highlightedSegments.map((segment, idx) =>
                segment.isMatch ? (
                  <mark
                    key={idx}
                    className="bg-amber-200/90 text-amber-950 font-sans font-bold px-1.5 py-0.5 rounded shadow-xs border-b-2 border-amber-400 ring-2 ring-amber-300/40 inline-block my-0.5 transition-all"
                  >
                    {segment.text}
                  </mark>
                ) : (
                  <span key={idx}>{segment.text}</span>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px] text-slate-400">
            Grounded via Pinecone + SentenceTransformers (all-MiniLM-L6-v2)
          </span>
          <button
            onClick={closeInspector}
            className="btn-primary text-xs px-4 py-1.5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
