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

  // format citations inline to match clickable style
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
      <div className="flex gap-4 max-w-3xl animate-slide-up">
        {/* User Icon Box */}
        <div className="size-9 rounded-lg bg-slate-100 shrink-0 border border-slate-200" />
        {/* User Content Bubble */}
        <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none text-base text-slate-800 flex flex-col gap-2">
          {message.imageUrl && (
            <img src={message.imageUrl} alt="Uploaded" className="rounded-xl max-h-72 object-contain border border-slate-200" />
          )}
          {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
        </div>
      </div>
    )
  }

  // Assistant response
  return (
    <div className="flex gap-4 max-w-3xl animate-slide-up">
      {/* DocuMIND Icon Badge */}
      <div className="size-9 rounded-lg bg-slate-900 shrink-0 flex items-center justify-center text-white text-xs font-bold">
        D
      </div>
      {/* Markdown Content Pane with larger text sizes */}
      <div className="text-base prose prose-slate max-w-none 
        prose-p:my-2.5 prose-p:leading-relaxed prose-p:text-slate-800 prose-p:text-base
        prose-headings:font-bold prose-headings:text-slate-900
        prose-li:my-1.5 prose-li:leading-relaxed prose-li:text-slate-800 prose-li:text-base
        prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5
        prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-5
        prose-strong:text-slate-950 prose-strong:font-extrabold prose-strong:text-base
        prose-code:text-slate-950 prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
      ">
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
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-md bg-blue-50 border border-blue-200 text-slate-700 text-xs font-semibold hover:bg-blue-100 cursor-pointer transition-all select-none whitespace-nowrap"
                    title="View source details"
                  >
                    <span>{parts[0]}</span>
                    {parts[1] && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[9.5px] rounded font-black tracking-wide uppercase shadow-sm">
                        PG {parts[1]}
                      </span>
                    )}
                  </span>
                )
              }
              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{children}</a>
            }
          }}
        >
          {getFormattedContent()}
        </ReactMarkdown>
      </div>
    </div>
  )
}
