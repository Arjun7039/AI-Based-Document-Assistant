import React, { useRef, useEffect, useState } from 'react'
import { HiOutlinePaperAirplane, HiOutlineSparkles, HiOutlinePhoto, HiXMark, HiOutlineDocumentArrowUp } from 'react-icons/hi2'
import MessageBubble from './MessageBubble'
import useStore from '../store/useStore'
import useChat from '../hooks/useChat'
import useUpload from '../hooks/useUpload'

const SUGGESTIONS = [
  "Summarize the key points",
  "What are the main risks?",
  "List action items",
  "Compare across documents"
]

export default function ChatWindow() {
  const { messages, isQuerying, documents, selectedDocumentIds } = useStore()
  const { send } = useChat()
  const { upload } = useUpload()
  const [input, setInput] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)   // image attachment picker
  const docInputRef = useRef(null)    // first-document uploader (empty state)
  const hasDocuments = documents.length > 0
  const hasSelectedDocs = selectedDocumentIds.length > 0
  const showDeselectedWarning = hasDocuments && !hasSelectedDocs

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isQuerying])

  // Auto-grow the textarea up to a cap as the user types
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [input])

  const handleSend = (e) => {
    e?.preventDefault()
    if ((!input.trim() && !imageFile) || isQuerying) return
    send(input, imageFile, imagePreview)
    setInput('')
    setImageFile(null)
    setImagePreview(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    // Enter sends; Shift+Enter inserts a newline
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const focusInput = () => textareaRef.current?.focus()

  const handleDocSelect = (e) => {
    const files = e.target.files
    if (files && files.length > 0) upload(files)
    e.target.value = ''
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-white to-slate-50/60">
      {/* Context bar */}
      <div className="h-12 sm:h-14 border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-white/70 backdrop-blur-sm">
        <div>
          <h2 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">Ask your documents</h2>
          <p className="hidden sm:block text-[11px] text-slate-400 font-medium">
            {selectedDocumentIds.length > 0
              ? `${selectedDocumentIds.length} document${selectedDocumentIds.length > 1 ? 's' : ''} in context`
              : 'No documents selected'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 bg-slate-100/80 border border-slate-200/60 rounded-full px-2.5 py-1">
          <HiOutlineSparkles className="w-3.5 h-3.5 text-indigo-500" />
          RAG v2
        </div>
      </div>

      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8 no-scrollbar">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-6 sm:py-12 animate-fade-in">
            <div className="inline-flex w-[52px] h-[52px] sm:w-14 sm:h-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 mb-5 shadow-glow animate-float">
              <HiOutlineSparkles className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 sm:mb-3 text-slate-900 text-balance">What do you want to know?</h2>
            <p className="text-slate-500 mb-6 sm:mb-8 text-sm sm:text-base leading-relaxed max-w-md mx-auto text-pretty">
              {!hasDocuments
                ? 'Upload a document to get started. Every answer cites the exact page it came from.'
                : 'Ask anything about your documents. We will find cited passages in seconds.'}
            </p>

            {!hasDocuments ? (
              /* Upload-first empty state */
              <button
                onClick={() => docInputRef.current?.click()}
                className="group w-full max-w-md mx-auto border-2 border-dashed border-slate-300 hover:border-indigo-300 rounded-3xl p-6 sm:p-8 bg-white shadow-soft hover:shadow-lift transition-all text-left active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 grid place-items-center group-hover:scale-105 transition-transform shrink-0">
                    <HiOutlineDocumentArrowUp className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Upload your first document</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Drag & drop into the sidebar or click here — PDF, DOCX, XLSX, PPTX, CSV, images.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2 flex-wrap">
                  {['PDF', 'DOCX', 'XLSX', 'PPTX', 'CSV', 'Images'].map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500">{t}</span>
                  ))}
                </div>
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-w-lg mx-auto text-left px-1 sm:px-0">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); focusInput() }}
                    className="p-3.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-indigo-200 hover:shadow-lift text-left text-slate-700 transition-all active:scale-[0.98]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto pb-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isQuerying && (
              <div className="flex gap-3 sm:gap-4 animate-fade-in">
                <div className="size-8 sm:size-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shrink-0 flex items-center justify-center text-white text-xs font-black shadow-glow">D</div>
                <div className="bg-white border border-slate-200/80 shadow-soft rounded-2xl rounded-tl-md px-4 py-3.5 flex items-center gap-1.5 mt-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-indigo-500 animate-typing-dot"
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="p-3 sm:p-5 pt-1 sm:pt-2 border-t border-slate-200/60 bg-white/85 backdrop-blur-md shrink-0">
        <form onSubmit={handleSend} className="relative max-w-3xl mx-auto">
          {imagePreview && (
            <div className="absolute bottom-full mb-2 left-1 bg-white border border-slate-200 rounded-xl p-2 flex items-center gap-2 shadow-lift animate-pop">
              <img src={imagePreview} alt="Attachment preview" className="h-14 w-auto max-w-[160px] rounded-lg object-cover border border-slate-200" />
              <button type="button" onClick={removeImage} aria-label="Remove image" className="p-1 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                <HiXMark className="w-4 h-4" />
              </button>
            </div>
          )}

          {showDeselectedWarning && (
            <div className="absolute bottom-full mb-2 left-0 right-0 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm font-bold shadow-lift animate-pop">
              ⚠️ Select at least one document checkbox in the sidebar to query.
            </div>
          )}

          {/* Pill composer */}
          <div className={`relative flex items-end gap-1.5 border bg-white rounded-2xl pl-3 pr-2 py-1.5 shadow-lift transition-all duration-150 ${
            showDeselectedWarning ? 'opacity-60 border-amber-300' : 'border-slate-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10'
          }`}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={showDeselectedWarning ? 'Select a document first…' : 'Ask anything about your documents…'}
              disabled={showDeselectedWarning}
              className="flex-1 resize-none bg-transparent py-2.5 text-sm sm:text-[15px] leading-relaxed focus:outline-none placeholder:text-slate-400 disabled:cursor-not-allowed text-slate-900 max-h-[140px] no-scrollbar"
            />

            <div className="flex items-center gap-1 pb-1 shrink-0">
              <input type="file" multiple accept=".pdf,.docx,.xlsx,.xls,.csv,.pptx,.txt,.md,.json,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff" className="hidden" ref={docInputRef} onChange={handleDocSelect} />
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach image"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
                title="Attach image"
              >
                <HiOutlinePhoto className="w-5 h-5" />
              </button>

              <button
                type="submit"
                disabled={(!input.trim() && !imageFile) || isQuerying || showDeselectedWarning}
                aria-label="Send message"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white grid place-items-center shadow-glow disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none hover:brightness-110 active:scale-95 transition-all"
              >
                {isQuerying ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <HiOutlinePaperAirplane className="w-4 h-4 -rotate-45 translate-x-[1px]" />
                )}
              </button>
            </div>
          </div>

          <p className="hidden sm:block text-center text-[11px] text-slate-400 font-medium mt-2">
            <kbd className="font-sans font-semibold text-slate-500">Enter</kbd> to send ·{' '}
            <kbd className="font-sans font-semibold text-slate-500">Shift + Enter</kbd> for a new line
          </p>
        </form>
      </div>
    </div>
  )
}
