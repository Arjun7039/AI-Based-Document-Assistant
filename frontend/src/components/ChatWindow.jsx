import React, { useRef, useEffect, useState } from 'react'
import { HiOutlinePaperAirplane, HiOutlineSparkles, HiOutlinePhoto, HiXMark } from 'react-icons/hi2'
import MessageBubble from './MessageBubble'
import useStore from '../store/useStore'
import useChat from '../hooks/useChat'

const SUGGESTIONS = [
  "Summarize the key points",
  "What are the main risks?",
  "List action items",
  "Compare across documents"
]

export default function ChatWindow() {
  const { messages, isQuerying, documents, selectedDocumentIds } = useStore()
  const { send } = useChat()
  const [input, setInput] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const hasDocuments = documents.length > 0
  const hasSelectedDocs = selectedDocumentIds.length > 0
  const showDeselectedWarning = hasDocuments && !hasSelectedDocs

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isQuerying])

  const handleSend = (e) => {
    e?.preventDefault()
    if ((!input.trim() && !imageFile) || isQuerying) return
    send(input, imageFile, imagePreview)
    setInput('')
    setImageFile(null)
    setImagePreview(null)
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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Top Header Title */}
      <div className="h-12 sm:h-16 border-b border-slate-200 px-4 sm:px-6 flex items-center shrink-0">
        <h1 className="font-bold text-sm sm:text-base text-slate-800">Ask your documents</h1>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8 no-scrollbar">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-8 sm:py-16 animate-fade-in">
            <div className="inline-flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-blue-50 mb-4 sm:mb-5 border border-blue-100 shadow-sm animate-bounce">
              <HiOutlineSparkles className="size-6 sm:size-7 text-blue-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 sm:mb-3 text-slate-900">What do you want to know?</h2>
            <p className="text-slate-500 mb-6 sm:mb-8 text-sm sm:text-base leading-relaxed max-w-md mx-auto px-2">
              {!hasDocuments
                ? 'Upload a document in the sidebar to get started. Answers come with citations to the exact page.'
                : 'Ask anything about your documents. We will find cited passages in seconds.'
              }
            </p>

            {hasDocuments ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-w-lg mx-auto text-left px-2 sm:px-0">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); fileInputRef.current?.focus() }}
                    className="p-3 sm:p-4 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 text-left text-slate-700 transition-all shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 max-w-md text-left space-y-3 sm:space-y-3.5 mx-auto shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Setup</p>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">1</div>
                  <p className="text-sm text-slate-600">Click <span className="font-bold text-slate-800">Upload document</span> in sidebar</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">2</div>
                  <p className="text-sm text-slate-600">Select the documents you want to query</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">3</div>
                  <p className="text-sm text-slate-600">Enter your prompt in the box below</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isQuerying && (
              <div className="flex gap-3 sm:gap-4 animate-pulse">
                <div className="size-8 sm:size-9 rounded-lg bg-slate-900 shrink-0 flex items-center justify-center text-white text-xs font-bold">D</div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500 pt-2">
                  <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                  Searching your documents…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 sm:p-6 border-t border-slate-200 bg-white shrink-0">
        <form onSubmit={handleSend} className="relative max-w-3xl mx-auto">
          {imagePreview && (
            <div className="absolute bottom-full mb-2 sm:mb-3 left-0 bg-slate-50 border border-slate-200 rounded-xl p-2 sm:p-2.5 flex items-center gap-2 shadow-md">
              <img src={imagePreview} alt="Preview" className="h-12 sm:h-16 w-auto rounded object-cover border border-slate-200" />
              <button type="button" onClick={removeImage} className="p-1 rounded-full hover:bg-slate-200 text-slate-500">
                <HiXMark className="w-4 h-4" />
              </button>
            </div>
          )}

          {showDeselectedWarning && (
            <div className="absolute bottom-full mb-2 sm:mb-3 left-0 right-0 p-2.5 sm:p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm font-bold shadow-md">
              ⚠️ Please select a document in the sidebar checkbox to query.
            </div>
          )}

          <div className="flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={showDeselectedWarning ? 'Please select a document first...' : 'Ask your documents anything…'}
              disabled={showDeselectedWarning}
              className="w-full border border-slate-200 bg-white rounded-xl py-3 sm:py-4 pl-4 sm:pl-5 pr-24 sm:pr-28 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 placeholder:text-slate-400 text-slate-900 shadow-sm"
            />
            
            <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all"
                title="Attach Image"
              >
                <HiOutlinePhoto className="w-5 h-5" />
              </button>
              
              <button
                type="submit"
                disabled={(!input.trim() && !imageFile) || isQuerying || showDeselectedWarning}
                className="size-9 sm:size-10 rounded-lg bg-slate-900 text-white grid place-items-center disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                <HiOutlinePaperAirplane className="size-4 rotate-45" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
