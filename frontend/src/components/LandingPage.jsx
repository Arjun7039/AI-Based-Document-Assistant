import React from 'react'
import {
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowRight,
} from 'react-icons/hi2'

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-dvh bg-white text-slate-900 font-sans overflow-y-auto">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-4 sm:px-8 h-14 sm:h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5 font-bold text-lg sm:text-xl tracking-tight text-slate-900">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-glow">
            <span className="text-white text-xs font-black">D</span>
          </div>
          <span>Docu<span className="gradient-text">MIND</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#workspace" className="hover:text-slate-900 transition-colors">Workspace</a>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={onGetStarted} className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Sign in
          </button>
          <button onClick={onGetStarted} className="btn-primary !px-4 !py-2">
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-14 sm:pt-24 pb-10 sm:pb-16 px-4 sm:px-8 max-w-6xl mx-auto text-center overflow-hidden">
        {/* Ambient gradient blobs */}
        <div aria-hidden className="absolute -top-24 -left-32 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-indigo-200/50 to-violet-200/40 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute top-10 -right-32 w-[380px] h-[380px] rounded-full bg-gradient-to-bl from-cyan-100/60 to-indigo-100/40 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-soft text-xs font-semibold text-slate-600 mb-6 sm:mb-8 animate-slide-up">
            <HiOutlineSparkles className="w-3.5 h-3.5 text-indigo-600" />
            RAG engine v2 · Now with citation tracing
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-4 sm:mb-6 text-slate-900 text-balance leading-[1.08] sm:leading-[1.04] animate-fade-in">
            Your library, <span className="gradient-text">intelligent.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed text-pretty">
            Upload complex PDFs, spreadsheets, and documentation. Get cited answers in seconds with a precision RAG engine built for researchers and technical teams.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 animate-slide-up">
            <button
              onClick={onGetStarted}
              className="btn-primary px-7 py-3.5 inline-flex items-center justify-center gap-2"
            >
              Get started now <HiOutlineArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#workspace"
              className="border border-slate-200 bg-white text-slate-700 px-7 py-3.5 rounded-xl font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm text-center active:scale-[0.99]"
            >
              See the workspace
            </a>
          </div>
        </div>
      </section>

      {/* ── Workspace preview mockup ── */}
      <section id="workspace" className="px-4 sm:px-8 pb-16 sm:pb-24 scroll-mt-16">
        <div className="max-w-6xl mx-auto rounded-2xl border border-slate-200 shadow-lift overflow-hidden bg-white flex flex-col md:flex-row h-auto md:h-[520px] transition-transform">
          {/* Mock sidebar */}
          <aside className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-200/80 bg-slate-50/70 flex flex-col p-4">
            <div className="pb-4 border-b border-slate-200/80">
              <div className="w-full bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold shadow-sm text-slate-700">
                + New Upload
              </div>
            </div>
            <div className="flex-1 py-4 space-y-1 hidden md:block">
              <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.14em] mb-3">Recent documents</div>
              <div className="p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-2">
                <HiOutlineDocumentText className="w-3.5 h-3.5 text-indigo-500" />
                Q4_Risk_Analysis.pdf
              </div>
              <div className="p-2 rounded-lg text-xs text-slate-500 flex items-center gap-2 hover:bg-white transition-colors cursor-default">
                <HiOutlineDocumentText className="w-3.5 h-3.5 text-blue-400" />
                Legal_Framework_v2.docx
              </div>
              <div className="p-2 rounded-lg text-xs text-slate-500 flex items-center gap-2 hover:bg-white transition-colors cursor-default">
                <HiOutlineDocumentText className="w-3.5 h-3.5 text-emerald-500" />
                Engineering_Specs.pdf
              </div>
            </div>
          </aside>

          {/* Mock chat */}
          <main className="flex-1 flex flex-col bg-gradient-to-b from-white to-slate-50/50">
            <div className="flex-1 p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
              <div className="flex justify-end">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-3 sm:p-4 rounded-2xl rounded-br-md text-xs max-w-[85%] sm:max-w-[75%] leading-relaxed shadow-lift">
                  What are the mitigation strategies for supply chain risks?
                </div>
              </div>
              <div className="flex gap-3 sm:gap-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shrink-0 flex items-center justify-center text-white text-[10px] font-black shadow-glow">D</div>
                <div className="bg-white border border-slate-200/80 shadow-soft rounded-2xl rounded-tl-md p-3 sm:p-4 text-xs space-y-2 sm:space-y-3 max-w-[90%] sm:max-w-[85%] leading-relaxed">
                  <p className="text-slate-800">Based on <strong className="text-slate-950 font-bold">Q4 Risk Analysis</strong>, the key strategies are:</p>
                  <ul className="list-disc ml-4 space-y-1.5 sm:space-y-2 text-slate-700 marker:text-indigo-400">
                    <li>Dual-sourcing critical components <span className="inline-flex items-center gap-1 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md text-[10px] font-bold border border-indigo-100">📄 p.12</span></li>
                    <li>Real-time inventory tracking <span className="inline-flex items-center gap-1 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md text-[10px] font-bold border border-indigo-100">📄 p.15</span></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="p-3 sm:p-4 md:p-6">
              <div className="border border-slate-200 bg-white rounded-2xl py-3 px-4 text-xs text-slate-400 shadow-lift flex items-center justify-between">
                Ask your documents anything…
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 inline-block" />
              </div>
            </div>
          </main>

          {/* Mock source panel */}
          <aside className="hidden lg:flex w-72 border-l border-slate-200/80 bg-slate-50/70 flex-col">
            <div className="p-4 border-b border-slate-200/80 font-bold text-xs text-slate-500 uppercase tracking-wider">Source preview</div>
            <div className="flex-1 p-4">
              <div className="bg-white border border-slate-200/80 h-full rounded-2xl shadow-sm p-4 space-y-3 relative overflow-hidden">
                <div className="w-full h-2.5 bg-slate-100 rounded" />
                <div className="w-3/4 h-2.5 bg-slate-100 rounded mb-4" />
                <div className="w-full h-24 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 relative">
                  <div className="w-full h-2.5 bg-indigo-500/15 rounded mb-1.5" />
                  <div className="w-5/6 h-2.5 bg-indigo-500/15 rounded" />
                  <div className="absolute top-2 left-0 w-0.5 h-20 bg-indigo-500 rounded" />
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded" />
                <div className="w-2/3 h-2.5 bg-slate-100 rounded" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-slate-50/70 py-16 sm:py-24 px-4 sm:px-8 border-y border-slate-200/80 scroll-mt-14">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12">
            {[
              { n: '01', icon: HiOutlineDocumentText, title: 'Contextual Citations', desc: 'Every answer links to the exact passage in your source document.', tint: 'from-indigo-50 to-violet-50 text-indigo-600' },
              { n: '02', icon: HiOutlineShieldCheck, title: 'Private & Secure', desc: 'Your data is encrypted, scoped to your account, and never used to train public models.', tint: 'from-emerald-50 to-teal-50 text-emerald-600' },
              { n: '03', icon: HiOutlineMagnifyingGlass, title: 'Multi-file Synthesis', desc: 'Ask questions across hundreds of files at once and find patterns instantly.', tint: 'from-cyan-50 to-sky-50 text-cyan-600' },
            ].map((it) => (
              <div key={it.n} className="group">
                <div className={`w-11 h-11 rounded-xl border bg-gradient-to-br ${it.tint} grid place-items-center mb-4 sm:mb-5 shadow-soft group-hover:scale-105 group-hover:shadow-lift transition-all`}>
                  <it.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{it.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{it.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-8 text-center bg-white overflow-hidden">
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-indigo-50/70 to-transparent pointer-events-none" />
        <div className="relative">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight mb-4 sm:mb-6 text-slate-900 text-balance">
            Ship answers, not searches.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto mb-7 sm:mb-9 text-sm sm:text-base leading-relaxed">
            Stop hunting through PDFs. Let DocuMIND read them for you — with receipts.
          </p>
          <button
            onClick={onGetStarted}
            className="btn-primary px-7 py-3.5 inline-flex items-center gap-2"
          >
            Create your workspace <HiOutlineArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200/80 py-8 sm:py-12 px-4 sm:px-8 bg-white">
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
