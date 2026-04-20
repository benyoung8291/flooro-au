import { AnimateIn, StaggerContainer, StaggerItem } from "./AnimateIn";

const steps = [
  { title: "Upload or draw the plan", desc: "Drop a PDF, snap a photo on-site, or sketch the room from scratch. Set scale with two clicks and you're measuring.", pill: "Under 60 sec", pillColor: "bg-fr-coral-bg" },
  { title: "Pick materials & let it cut", desc: "Choose from your price book or import from a manufacturer URL. The optimiser handles seams, drops, and waste automatically.", pill: "Smart cuts", pillColor: "bg-fr-warm-bg" },
  { title: "Send a sharp quote", desc: "Hierarchical line items, your letterhead, your terms. Email the PDF or export to CSV/Excel. Sync changes back to the takeoff anytime.", pill: "Client-ready", pillColor: "bg-fr-orange-bg" },
];

export default function HowItWorksSection() {
  return (
    <section id="how" className="mx-4 md:mx-8 rounded-[32px] bg-cream-2/80 backdrop-blur-xl px-6 md:px-12 py-20 md:py-28 scroll-mt-24">
      <div className="max-w-5xl mx-auto">
        <AnimateIn>
          <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground mb-4">How it works</div>
          <h2 className="font-display text-[clamp(34px,4.5vw,56px)] font-black leading-[1.0] tracking-[-0.04em] text-foreground mb-4">
            From floor plan<br />to signed quote, fast
          </h2>
          <p className="text-[17px] text-muted-foreground max-w-[480px] leading-[1.7] font-medium mb-12">
            Three steps. No CAD course. You'll have a sendable quote before the kettle boils.
          </p>
        </AnimateIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <StaggerItem key={i}>
              <div className="bg-card border border-border/40 rounded-3xl p-8 h-full">
                <div className="w-9 h-9 rounded-full bg-foreground text-background text-[13px] font-black flex items-center justify-center mb-6">
                  {i + 1}
                </div>
                <h4 className="font-display text-[17px] font-extrabold tracking-tight mb-3">{s.title}</h4>
                <p className="text-[13px] text-muted-foreground leading-[1.65] font-medium">{s.desc}</p>
                <span className={`inline-block mt-4 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-[0.04em] ${s.pillColor} text-foreground`}>
                  {s.pill}
                </span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
