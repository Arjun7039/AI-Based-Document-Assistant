import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { FileText, Search, Shield, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Syntax — Your library, intelligent." },
      { name: "description", content: "Upload complex PDFs, spreadsheets, and documentation. Get cited answers in seconds with a precision RAG engine built for researchers and technical teams." },
      { property: "og:title", content: "Syntax — Your library, intelligent." },
      { property: "og:description", content: "Upload your documents. Ask anything. Get cited answers grounded in your sources." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Workspace />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="flex items-center justify-between px-8 h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
        <div className="size-6 bg-primary rounded-sm" />
        <span>SYNTAX</span>
      </Link>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
        <a href="#features" className="hover:text-foreground transition-colors">Features</a>
        <a href="#workspace" className="hover:text-foreground transition-colors">Workspace</a>
        <a href="#security" className="hover:text-foreground transition-colors">Security</a>
      </div>
      <div className="flex items-center gap-4">
        <Link to="/auth" className="text-sm font-medium hover:text-accent transition-colors">Sign in</Link>
        <Link to="/auth" search={{ mode: "signup" } as never} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
          Get started
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-24 pb-16 px-8 max-w-6xl mx-auto text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs font-medium text-muted-foreground mb-8">
        <Sparkles className="size-3 text-accent" />
        RAG engine v2 · Now with citation tracing
      </div>
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-balance">
        Your library, <span className="text-accent">intelligent.</span>
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty">
        Upload complex PDFs and documentation. Get cited answers in seconds with an advanced retrieval engine grounded in your sources.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/auth" className="bg-primary text-primary-foreground px-7 py-3.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2">
          Get Started Now <ArrowRight className="size-4" />
        </Link>
        <a href="#workspace" className="border border-border px-7 py-3.5 rounded-lg font-semibold text-sm hover:bg-muted transition-colors">
          See the workspace
        </a>
      </div>
    </section>
  );
}

function Workspace() {
  return (
    <section id="workspace" className="px-8 pb-24">
      <div className="max-w-7xl mx-auto border border-border rounded-xl shadow-2xl overflow-hidden bg-card flex h-[640px]">
        <aside className="w-64 border-r border-border bg-muted/50 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="w-full bg-card border border-border p-2 rounded flex items-center justify-center gap-2 text-sm font-medium shadow-sm">
              + New Upload
            </div>
          </div>
          <div className="flex-1 p-4 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Recent Documents</div>
            <div className="p-2 bg-card border border-border rounded text-sm font-medium shadow-sm">Q4_Risk_Analysis.pdf</div>
            <div className="p-2 rounded text-sm text-muted-foreground">Legal_Framework_v2.docx</div>
            <div className="p-2 rounded text-sm text-muted-foreground">Engineering_Specs.pdf</div>
          </div>
        </aside>
        <main className="flex-1 flex flex-col bg-card">
          <div className="flex-1 p-6 space-y-6">
            <div className="flex gap-4">
              <div className="size-8 rounded bg-muted shrink-0 border border-border" />
              <div className="bg-muted p-4 rounded-2xl rounded-tl-none text-sm max-w-[80%]">
                What are the mitigation strategies for supply chain risks?
              </div>
            </div>
            <div className="flex gap-4">
              <div className="size-8 rounded bg-primary shrink-0 flex items-center justify-center text-primary-foreground text-[10px] font-bold">S</div>
              <div className="p-4 text-sm space-y-3">
                <p>Based on <strong>Q4 Risk Analysis</strong>, the key strategies are:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Dual-sourcing critical components <span className="text-accent bg-accent/10 px-1 rounded">[Doc 1, p. 12]</span></li>
                  <li>Real-time inventory tracking <span className="text-accent bg-accent/10 px-1 rounded">[Doc 1, p. 15]</span></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-border">
            <div className="border border-border rounded-lg py-3 px-4 text-sm text-muted-foreground">
              Ask your documents anything…
            </div>
          </div>
        </main>
        <aside className="w-80 border-l border-border bg-muted/50 flex flex-col">
          <div className="p-4 border-b border-border font-semibold text-sm">Source Preview</div>
          <div className="flex-1 p-4">
            <div className="bg-card border border-border h-full rounded shadow-sm p-6">
              <div className="w-full h-3 bg-muted mb-2 rounded" />
              <div className="w-3/4 h-3 bg-muted mb-6 rounded" />
              <div className="w-full h-28 bg-accent/5 border border-accent/20 rounded mb-4 p-4 relative">
                <div className="w-full h-3 bg-accent/20 rounded mb-2" />
                <div className="w-5/6 h-3 bg-accent/20 rounded mb-2" />
                <div className="w-4/6 h-3 bg-accent/20 rounded" />
                <div className="absolute top-2 left-0 w-1 h-24 bg-accent" />
              </div>
              <div className="w-full h-3 bg-muted mb-2 rounded" />
              <div className="w-2/3 h-3 bg-muted rounded" />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { n: "01", icon: FileText, title: "Contextual Citations", desc: "Every answer links to the exact passage in your source document." },
    { n: "02", icon: Shield, title: "Private & Secure", desc: "Your data is encrypted, scoped to your account, and never used to train public models." },
    { n: "03", icon: Search, title: "Multi-file Synthesis", desc: "Ask questions across hundreds of files at once and find patterns instantly." },
  ];
  return (
    <section id="features" className="bg-muted/50 py-24 px-8 border-y border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12">
          {items.map((it) => (
            <div key={it.n}>
              <div className="size-10 bg-card border border-border rounded-lg mb-6 flex items-center justify-center font-bold">{it.n}</div>
              <h3 className="text-lg font-bold mb-3">{it.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="security" className="py-24 px-8 text-center">
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Ship answers, not searches.</h2>
      <p className="text-muted-foreground max-w-xl mx-auto mb-8">Stop hunting through PDFs. Let Syntax read them for you, with receipts.</p>
      <Link to="/auth" className="bg-primary text-primary-foreground px-7 py-3.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2">
        Create your workspace <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-12 px-8">
      <div className="max-w-6xl mx-auto flex justify-between items-center text-sm text-muted-foreground">
        <div>© 2026 Syntax Research Systems.</div>
        <div className="flex gap-8">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </div>
    </footer>
  );
}
