import React from 'react'
import { HiOutlineTrash, HiOutlineExclamationCircle, HiOutlineDocumentText } from 'react-icons/hi2'
import useStore from '../store/useStore'

/* Per-format icon tint — makes long lists scannable at a glance */
const TYPE_STYLES = {
  pdf: { icon: HiOutlineDocumentText, classes: 'bg-red-50 text-red-500 border-red-100' },
  docx: { icon: HiOutlineDocumentText, classes: 'bg-blue-50 text-blue-500 border-blue-100' },
  xlsx: { icon: HiOutlineDocumentText, classes: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  xls: { icon: HiOutlineDocumentText, classes: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  csv: { icon: HiOutlineDocumentText, classes: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  pptx: { icon: HiOutlineDocumentText, classes: 'bg-orange-50 text-orange-500 border-orange-100' },
}

const DEFAULT_TYPE_STYLE = {
  icon: HiOutlineDocumentText,
  classes: 'bg-slate-100 text-slate-500 border-slate-200',
}

function TypeIcon({ fileType }) {
  const style = TYPE_STYLES[fileType] || DEFAULT_TYPE_STYLE
  const Icon = style.icon
  return (
    <div className={`w-8 h-8 shrink-0 rounded-lg border grid place-items-center ${style.classes}`}>
      <Icon className="w-4 h-4" />
    </div>
  )
}

export default function DocumentList() {
  const { documents, removeDocument, selectedDocumentIds, toggleSelectDocument, selectAllDocuments, deselectAllDocuments } = useStore()

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center">
        <p className="text-xs text-slate-400 leading-relaxed">No documents yet.<br />Drop files above to index them.</p>
      </div>
    )
  }

  const readyDocs = documents.filter((d) => d.status === 'ready')
  const allSelected = readyDocs.length > 0 && readyDocs.every((d) => selectedDocumentIds.includes(d.id))

  return (
    <div className="space-y-1">
      {readyDocs.length > 0 && (
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[10px] font-bold text-slate-400">
            {selectedDocumentIds.length} of {readyDocs.length} selected
          </span>
          <button
            onClick={allSelected ? deselectAllDocuments : selectAllDocuments}
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 uppercase tracking-wider transition-colors"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      )}
      <div className="space-y-1">
        {documents.map((doc) => {
          const isSelected = selectedDocumentIds.includes(doc.id)
          const isReady = doc.status === 'ready'
          const isProcessing = !isReady && doc.status !== 'failed'
          return (
            <div
              key={doc.id}
              onClick={() => isReady && toggleSelectDocument(doc.id)}
              className={`group relative flex items-center gap-2.5 p-2 rounded-xl cursor-pointer border transition-all ${
                isReady && isSelected
                  ? 'bg-indigo-50/70 border-indigo-200 shadow-sm'
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              {isReady ? (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => { e.stopPropagation(); toggleSelectDocument(doc.id) }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 shrink-0 rounded border-slate-300 focus:ring-indigo-500/20 cursor-pointer"
                />
              ) : isProcessing ? (
                <div className="size-[18px] shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-[18px] h-[18px] -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round"
                      strokeDasharray={`${Math.min(doc.progressPercent || 5, 99)} 100`}
                      pathLength="100"
                      className="transition-all duration-700"
                    />
                  </svg>
                </div>
              ) : (
                <HiOutlineExclamationCircle className="w-[18px] h-[18px] text-red-400 shrink-0" />
              )}

              <TypeIcon fileType={doc.fileType} />

              <div className="flex-1 min-w-0 py-0.5">
                <span className={`truncate block text-xs leading-snug ${isReady && isSelected ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`} title={doc.filename}>
                  {doc.filename}
                </span>
                {doc.status === 'failed' ? (
                  <span className="block text-[11px] text-red-500 mt-0.5 truncate" title={doc.errorMessage}>
                    {doc.errorMessage || 'Processing failed'}
                  </span>
                ) : isProcessing ? (
                  <span className="block text-[11px] text-indigo-500 mt-0.5 font-semibold">
                    Indexing… {Math.round(doc.progressPercent || 0)}%
                  </span>
                ) : (
                  <span className="block text-[11px] text-slate-400 mt-0.5">
                    {doc.pages > 0 ? `${doc.pages} pages · ` : ''}{doc.chunksIndexed > 0 ? `${doc.chunksIndexed} chunks` : 'Ready'}
                  </span>
                )}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); removeDocument(doc.id) }}
                aria-label={`Delete ${doc.filename}`}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
              >
                <HiOutlineTrash className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
