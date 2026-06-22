import React from 'react'
import { HiOutlineTrash, HiOutlineCheckCircle, HiOutlineExclamationCircle } from 'react-icons/hi2'
import useStore from '../store/useStore'

export default function DocumentList() {
  const { documents, removeDocument, selectedDocumentIds, toggleSelectDocument, selectAllDocuments, deselectAllDocuments } = useStore()

  if (documents.length === 0) {
    return <div className="text-xs text-slate-400 p-2">No documents yet.</div>
  }

  const readyDocs = documents.filter((d) => d.status === 'ready')
  const allSelected = readyDocs.length > 0 && readyDocs.every((d) => selectedDocumentIds.includes(d.id))

  return (
    <div className="space-y-1">
      {readyDocs.length > 0 && (
        <div className="flex justify-end mb-2">
          <button
            onClick={allSelected ? deselectAllDocuments : selectAllDocuments}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-500 uppercase tracking-wider transition-colors"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}
      <div className="space-y-1">
        {documents.map((doc) => {
          const isSelected = selectedDocumentIds.includes(doc.id)
          const isReady = doc.status === 'ready'
          return (
            <div
              key={doc.id}
              onClick={() => isReady && toggleSelectDocument(doc.id)}
              className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                isReady && isSelected
                  ? 'bg-slate-100 border-slate-200 text-slate-950 font-bold shadow-sm'
                  : 'bg-white border-transparent hover:bg-slate-50 text-slate-700 font-medium'
              }`}
            >
              {isReady && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => { e.stopPropagation(); toggleSelectDocument(doc.id) }}
                  className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                />
              )}
              
              {doc.status === 'ready' ? (
                <HiOutlineCheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
              ) : doc.status === 'failed' ? (
                <HiOutlineExclamationCircle className="w-5 h-5 text-red-500 shrink-0" />
              ) : (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <span className="truncate block text-sm leading-normal" title={doc.filename}>{doc.filename}</span>
                {doc.status === 'failed' && doc.errorMessage && (
                  <span className="block text-xs text-red-500 mt-0.5 truncate" title={doc.errorMessage}>
                    {doc.errorMessage}
                  </span>
                )}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); removeDocument(doc.id) }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
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
