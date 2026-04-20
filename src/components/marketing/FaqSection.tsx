import { AnimateIn, StaggerContainer, StaggerItem } from "./AnimateIn";

const faqs = [
  { q: "\"I already use a spreadsheet. Why switch?\"", title: "Spreadsheets don't draw rooms.", answer: "A spreadsheet can hold prices, but it can't optimise a roll layout, snap a polygon to scale, or generate a client-facing PDF. Flooro does all three from one input — your floor plan." },
  { q: "\"My measurements have to be perfect. Can I trust this?\"", title: "It's accurate to the millimetre.", answer: "Two-click scale calibration locks the plan to real-world units. Vertex snapping, right-angle enforcement, and inline edge editing mean you control every measurement to mm precision." },
  { q: "\"What about complex jobs — herringbone, multiple rooms, transitions?\"", title: "That's exactly what it's built for.", answer: "Pattern engine handles herringbone, basketweave, brick, thirds, and diagonal at any angle. Transitions, shared edges, coving, and cross-room offcut reuse are built in — not bolt-ons." },
  { q: "\"Is my pricing data safe?\"", title: "Your price book is yours.", answer: "Material costs and quotes live in your private organisation. Team members you invite see what you allow. Nothing is shared with other Flooro users — ever." },
];

export default function FaqSection() {
  return (
    <section id="faq" className="mx-4 md:mx-8 rounded-[32px] bg-cream-2/80 backdrop-blur-xl px-6 md:px-12 py-20 md:py-28 scroll-mt-24">
      <div className="max-w-5xl mx-auto">
        <AnimateIn>
          <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground mb-4">Honest questions</div>
          <h2 className="font-display text-[clamp(34px,4.5vw,56px)] font-black leading-[1.0] tracking-[-0.04em] text-foreground mb-4">Straight answers</h2>
          <p className="text-[17px] text-muted-foreground max-w-[480px] leading-[1.7] font-medium mb-14">We've heard the doubts. Here's where we stand.</p>
        </AnimateIn>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[920px]">
          {faqs.map((o) => (
            <StaggerItem key={o.title}>
              <div className="bg-card border border-border/40 rounded-3xl p-8 h-full hover:shadow-lg transition-shadow">
                <div className="text-sm italic text-muted-foreground mb-4 leading-[1.65] font-medium pl-4 border-l-[3px] border-muted-foreground/20">{o.q}</div>
                <h4 className="font-display text-[17px] font-black tracking-tight mb-2">{o.title}</h4>
                <p className="text-[13px] text-muted-foreground leading-[1.7] font-medium">{o.answer}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
