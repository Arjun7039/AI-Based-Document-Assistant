import React from 'react'
import { HiOutlineArrowUpTray, HiOutlineDocumentArrowUp } from 'react-icons/hi2'
import { useDropzone } from 'react-dropzone'
import useStore from '../store/useStore'
import useUpload from '../hooks/useUpload'

export default function UploadZone() {
  const { isUploading, uploadProgress } = useStore()
  const { upload, error, clearError } = useUpload()

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0 || isUploading) return
    clearError()
    await upload(acceptedFiles)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
    noClick: false,
    noKeyboard: true,
    // Extension check only — MIME types are unreliable for .docx/.xlsx across OSes
    validator: (file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const allowed = ['pdf', 'docx', 'xlsx', 'xls', 'csv', 'pptx', 'txt', 'md', 'json', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff']
      return allowed.includes(ext) ? null : { code: 'file-invalid-type' }
    },
  })

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`
          group relative w-full rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden
          ${isDragActive
            ? 'border-indigo-400 bg-indigo-50/80 ring-4 ring-indigo-500/10 scale-[0.99]'
            : 'border-slate-300 bg-gradient-to-b from-white to-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-lift active:scale-[0.99]'}
        `}
      >
        <input {...getInputProps()} multiple accept=".pdf,.docx,.xlsx,.xls,.csv,.pptx,.txt,.md,.markdown,.json,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff" />
        <div className="flex items-center gap-3 px-4 py-4">
          <div className={`w-11 h-11 shrink-0 rounded-xl grid place-items-center transition-colors ${
            isDragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-900 text-white group-hover:bg-gradient-to-br group-hover:from-indigo-600 group-hover:to-violet-600'
          }`}>
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <HiOutlineDocumentArrowUp className="w-6 h-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 leading-tight">
              {isUploading ? `Uploading… ${uploadProgress}%` : isDragActive ? 'Drop to upload' : 'Upload documents'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {isUploading ? 'Indexing in the background' : 'Drag & drop or click — PDF, DOCX, XLSX, images'}
            </p>
          </div>
          {!isUploading && (
            <HiOutlineArrowUpTray className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
          )}
        </div>

        {/* Determinate progress bar */}
        {isUploading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 animate-pop">
          <p className="text-xs text-red-600 font-semibold break-words">{error}</p>
          <button onClick={clearError} className="text-red-400 hover:text-red-600 text-xs font-bold ml-auto shrink-0">✕</button>
        </div>
      )}
    </div>
  )
}
