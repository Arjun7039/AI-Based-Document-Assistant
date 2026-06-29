import React from 'react'
import { HiOutlineDocumentText, HiOutlineSparkles, HiOutlineShieldCheck, HiOutlineMagnifyingGlass, HiOutlineArrowRight } from 'react-icons/hi2'

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-dvh bg-white text-slate-900 font-sans overflow-y-auto">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-4 sm:px-8 h-14 sm:h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-2.5 font-bold text-lg sm:text-xl tracking-tight text-slate-900">
          <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-black">D</span>
          </div>
          <span>DocuMIND</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#workspace" className="hover:text-slate-900 transition-colors">Workspace</a>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={onGetStarted} className="hidden sm:block text-sm font-medium hover:text-slate-600 transition-colors text-slate-600">
            Sign in
          </button>
          <button onClick={onGetStarted} className="bg-slate-900 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-12 sm:pt-24 pb-10 sm:pb-16 px-4 sm:px-8 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 mb-6 sm:mb-8">
          <HiOutlineSparkles className="w-3.5 h-3.5 text-blue-600" />
          RAG engine v2 · Now with citation tracing
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 sm:mb-6 text-slate-900 text-balance leading-[1.1] sm:leading-[1.05]">
          Your library, <span className="text-blue-600">intelligent.</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed text-pretty px-2">
          Upload complex PDFs, spreadsheets, and documentation. Get cited answers in seconds with a precision RAG engine built for researchers and technical teams.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
          <button
            onClick={onGetStarted}
            className="bg-slate-900 text-white px-7 py-3.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
          >
            Get Started Now <HiOutlineArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#workspace"
            className="border border-slate-200 text-slate-700 px-7 py-3.5 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors text-center"
          >
            See the workspace
          </a>
        </div>
      </section>

      {/* ── Workspace Preview Mockup ── */}
      <section id="workspace" className="px-4 sm:px-8 pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto border border-slate-200 rounded-xl shadow-2xl overflow-hidden bg-white flex flex-col md:flex-row h-auto md:h-[520px]">
          {/* Mock Sidebar */}
          <aside className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 flex flex-col p-4">
            <div className="pb-4 border-b border-slate-200">
              <div className="w-full bg-white border border-slate-200 p-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold shadow-sm text-slate-700">
                + New Upload
              </div>
            </div>
            <div className="flex-1 py-4 space-y-1 hidden md:block">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Recent Documents</div>
              <div className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 shadow-sm flex items-center gap-2">
                <HiOutlineDocumentText className="w-3.5 h-3.5 text-blue-500" />
                Q4_Risk_Analysis.pdf
              </div>
              <div className="p-2 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                <HiOutlineDocumentText className="w-3.5 h-3.5 text-slate-400" />
                Legal_Framework_v2.docx
              </div>
              <div className="p-2 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                <HiOutlineDocumentText className="w-3.5 h-3.5 text-slate-400" />
                Engineering_Specs.pdf
              </div>
            </div>
          </aside>

          {/* Mock Chat Main */}
          <main className="flex-1 flex flex-col bg-white">
            <div className="flex-1 p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
              <div className="flex gap-3 sm:gap-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 border border-slate-200 shrink-0" />
                <div className="bg-slate-100 p-3 sm:p-4 rounded-2xl rounded-tl-none text-xs text-slate-800 max-w-[85%] sm:max-w-[80%] leading-relaxed">
                  What are the mitigation strategies for supply chain risks?
                </div>
              </div>
              <div className="flex gap-3 sm:gap-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 shrink-0 flex items-center justify-center text-white text-[10px] font-black">D</div>
                <div className="p-2 text-xs space-y-2 sm:space-y-3 max-w-[90%] sm:max-w-[85%] leading-relaxed">
                  <p className="text-slate-800">Based on <strong className="text-slate-950 font-bold">Q4 Risk Analysis</strong>, the key strategies are:</p>
                  <ul className="list-disc ml-4 space-y-1.5 sm:space-y-2 text-slate-700">
                    <li>Dual-sourcing critical components <span className="text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-500/20">📄 p.12</span></li>
                    <li>Real-time inventory tracking <span className="text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-500/20">📄 p.15</span></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="p-3 sm:p-4 md:p-6 border-t border-slate-100">
              <div className="border border-slate-200 rounded-lg py-3 px-4 text-xs text-slate-400">
                Ask your documents anything…
              </div>
            </div>
          </main>

          {/* Mock Source Preview */}
          <aside className="hidden lg:flex w-72 border-l border-slate-200 bg-slate-50/50 flex-col">
            <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-500 uppercase tracking-wider">Source Preview</div>
            <div className="flex-1 p-4">
              <div className="bg-white border border-slate-200 h-full rounded-lg shadow-sm p-4 space-y-3">
                <div className="w-full h-2.5 bg-slate-100 rounded" />
                <div className="w-3/4 h-2.5 bg-slate-100 rounded mb-4" />
                <div className="w-full h-24 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 relative">
                  <div className="w-full h-2.5 bg-blue-500/15 rounded mb-1.5" />
                  <div className="w-5/6 h-2.5 bg-blue-500/15 rounded" />
                  <div className="absolute top-2 left-0 w-0.5 h-20 bg-blue-500 rounded" />
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded" />
                <div className="w-2/3 h-2.5 bg-slate-100 rounded" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-slate-50/50 py-16 sm:py-24 px-4 sm:px-8 border-y border-slate-200">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12">
            {[
              { n: '01', icon: HiOutlineDocumentText, title: 'Contextual Citations', desc: 'Every answer links to the exact passage in your source document.' },
              { n: '02', icon: HiOutlineShieldCheck, title: 'Private & Secure', desc: 'Your data is encrypted, scoped to your account, and never used to train public models.' },
              { n: '03', icon: HiOutlineMagnifyingGlass, title: 'Multi-file Synthesis', desc: 'Ask questions across hundreds of files at once and find patterns instantly.' },
            ].map((it) => (
              <div key={it.n}>
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg mb-4 sm:mb-6 flex items-center justify-center font-bold text-slate-800 text-sm shadow-sm">
                  {it.n}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{it.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{it.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 text-center bg-white">
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-6 text-slate-900">
          Ship answers, not searches.
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto mb-6 sm:mb-8 text-sm leading-relaxed px-2">
          Stop hunting through PDFs. Let DocuMIND read them for you, with receipts.
        </p>
        <button
          onClick={onGetStarted}
          className="bg-slate-900 text-white px-7 py-3.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
        >
          Create your workspace <HiOutlineArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 py-8 sm:py-12 px-4 sm:px-8 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <span>© 2026 DocuMIND Systems.</span>
          <div className="flex gap-8">
            <a href="#" className="hover:text-slate-800 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-800 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
