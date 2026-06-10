import React, { useRef } from 'react'
import { HiOutlineArrowUpTray } from 'react-icons/hi2'
import useStore from '../store/useStore'
import useUpload from '../hooks/useUpload'

export default function UploadZone() {
  const { isUploading, uploadProgress } = useStore()
  const { upload, error, clearError } = useUpload()
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      clearError()
      upload(files[0])
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full bg-slate-900 text-white py-3 rounded-xl flex items-center justify-center gap-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-sm"
      >
        {isUploading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <HiOutlineArrowUpTray className="w-5 h-5 text-white" />
        )}
        {isUploading ? `Uploading ${uploadProgress}%` : 'Upload document'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        accept=".pdf,.txt,.md,.markdown,.csv,.json,.xlsx,.xls"
        onChange={handleFileChange}
      />
      {error && (
        <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-center">
          <p className="text-xs text-red-600 font-semibold">{error}</p>
        </div>
      )}
    </div>
  )
}
