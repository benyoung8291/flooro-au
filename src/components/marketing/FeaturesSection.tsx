import { Ruler, Scissors, FileText, Layers, Smartphone, Calculator } from "lucide-react";
import { AnimateIn, StaggerContainer, StaggerItem } from "./AnimateIn";

const features = [
  { icon: Ruler, bg: "bg-fr-coral-bg", iconBg: "bg-primary", title: "Magnetic-snap drawing", desc: "Trace floor plans with vertex, axis, and grid snapping. Polygons, cut-outs, curves — all to scale, all in seconds." },
  { icon: Scissors, bg: "bg-fr-orange-bg", iconBg: "bg-primary/30", title: "Smart cut optimisation", desc: "Greedy-strip algorithm packs roll goods at any angle. Cross-room offcut reuse. Less waste, fatter margin." },
  { icon: Layers, bg: "bg-fr-warm-bg", iconBg: "bg-primary/20", title: "Tile pattern engine", desc: "Grid, brick, herringbone, basketweave, diagonal — with proper box rounding and pattern-matching waste." },
  { icon: Smartphone, bg: "bg-fr-rose-bg", iconBg: "bg-primary/20", title: "Built for the site visit", desc: "Measure on your phone, snap a photo of a printed plan, and walk out with a quote ready to send." },
  { icon: FileText, bg: "bg-card", iconBg: "bg-fr-warm-bg", title: "Client-ready quotes", desc: "Hierarchical line items, your branding, sequential quote numbers. PDF, CSV, Excel — your choice." },
  { icon: Calculator, bg: "bg-fr-amber-bg", iconBg: "bg-primary/20", title: "Real cost modelling", desc: "Materials, labour, sundries, accessories, and margin — all in one number. No more surprise losses." },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="px-4 md:px-8 py-20 md:py-28 max-w-6xl mx-auto scroll-mt-24">
      <div className="flex flex-col md:flex-row items-start justify-between mb-12 gap-8">
        <AnimateIn>
          <h2 className="font-display text-[clamp(34px,4.5vw,56px)] font-black leading-[1.0] tracking-[-0.04em] text-foreground max-w-[420px]">
            Everything<br />a flooring quote<br />actually needs
          </h2>
        </AnimateIn>
        <AnimateIn>
          <p className="text-[15px] text-muted-foreground max-w-[320px] md:text-right font-medium leading-[1.7] mt-2">
            Not a generic estimator with a flooring add-on. Built end-to-end for sheet, plank, tile, and broadloom.
          </p>
        </AnimateIn>
      </div>
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((f) => (
          <StaggerItem key={f.title}>
            <div className={`${f.bg} border border-border/40 rounded-3xl p-7 flex flex-col gap-4 transition-all hover:-translate-y-1 hover:shadow-lg h-full`}>
              <div className={`w-12 h-12 rounded-2xl ${f.iconBg} flex items-center justify-center`}>
                <f.icon className="w-6 h-6 text-foreground" />
              </div>
              <h4 className="font-display text-[17px] font-extrabold tracking-tight text-foreground">{f.title}</h4>
              <p className="text-[13px] text-foreground/60 leading-[1.6] font-medium">{f.desc}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
