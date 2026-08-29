import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import useStore from '../store/useStore'

export default function MessageBubble({ message }) {
  const { openSourcePanel, setSources } = useStore()
  const isUser = message.role === 'user'

  const handleCitationClick = () => {
    try {
      const s = Array.isArray(message.sources) ? message.sources : []
      if (s.length > 0) setSources(s)
      openSourcePanel()
    } catch {}
  }

  // Format citations inline to match clickable style
  const getFormattedContent = () => {
    try {
      const raw = message.content || ''
      // Matches "(Source: ...)" safely supporting files with parentheses
      return raw.replace(/\(Source:\s*([^)]+(?:\([^)]*\)[^)]*)*)\)/gi, (match, innerContent) => {
        let filename = innerContent.trim()
        let page = ''

        // Split by the last occurrence of ", Page " or ", page "
        const pageRegex = /,\s*Page\s*([^,]+)$/i
        const pageMatch = filename.match(pageRegex)
        if (pageMatch) {
          page = pageMatch[1].trim()
          filename = filename.replace(pageRegex, '').trim()
        }

        const valid = page && page !== 'Unknown' && page !== '?' && page !== '0'
        const label = valid ? `📄 ${filename}, Page ${page}` : `📄 ${filename}`

        // Base64 encode the metadata to completely avoid markdown url parenthesis bugs
        let safeHash = ''
        try {
          const hashObj = { filename, page: valid ? page : '' }
          safeHash = btoa(encodeURIComponent(JSON.stringify(hashObj)))
        } catch {
          safeHash = 'citation'
        }

        return `[${label}](#source-${safeHash})`
      })
    } catch {
      return message.content || ''
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="max-w-[85%] sm:max-w-[75%] flex flex-col items-end gap-1.5">
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Uploaded"
              className="rounded-2xl max-h-72 object-contain border border-indigo-200/60 shadow-lift bg-white"
            />
          )}
          {message.content && (
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-lift">
              <p className="whitespace-pre-wrap text-sm sm:text-[15px] leading-relaxed">{message.content}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Assistant response
  return (
    <div className="flex gap-3 sm:gap-4 max-w-3xl animate-slide-up">
      {/* DocuMIND avatar */}
      <div className="size-8 sm:size-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shrink-0 flex items-center justify-center text-white text-xs font-black shadow-glow mt-0.5">
        D
      </div>

      {/* Markdown content */}
      <div className={`min-w-0 text-sm sm:text-base prose prose-slate max-w-none rounded-2xl bg-white border border-slate-200/80 shadow-soft px-4 py-3 sm:px-5 sm:py-4 ${message.isError ? 'border-red-200 bg-red-50/50' : ''}
        prose-p:my-2.5 prose-p:leading-relaxed prose-p:text-slate-800 prose-p:text-sm sm:prose-p:text-base
        prose-headings:font-bold prose-headings:text-slate-900
        prose-li:my-1.5 prose-li:leading-relaxed prose-li:text-slate-800 prose-li:text-sm sm:prose-li:text-base
        prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5
        prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-5
        prose-strong:text-slate-950 prose-strong:font-extrabold
        prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[13px] prose-code:font-semibold prose-code:border prose-code:border-indigo-100
      `}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              if (href && href.startsWith('#source-')) {
                const text = typeof children === 'string' ? children : String(children)
                const parts = text.split(', Page ')

                return (
                  <span
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCitationClick() }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-lg bg-indigo-50 border border-indigo-200/80 text-slate-700 text-xs font-semibold hover:bg-indigo-100 hover:border-indigo-300 cursor-pointer transition-all select-none whitespace-nowrap active:scale-95"
                    title="View source details"
                  >
                    <span>{parts[0]}</span>
                    {parts[1] && (
                      <span className="px-1.5 py-0.5 bg-amber-400 text-white text-[9.5px] rounded font-extrabold tracking-wide uppercase shadow-sm">
                        PG {parts[1]}
                      </span>
                    )}
                  </span>
                )
              }
              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500 hover:underline">{children}</a>
            }
          }}
        >
          {getFormattedContent()}
        </ReactMarkdown>
      </div>
    </div>
  )
}
