import { useNavigate } from "react-router-dom";
import { AnimateIn, StaggerContainer, StaggerItem } from "./AnimateIn";

const plans = [
  {
    tier: "Solo",
    name: "Free",
    price: "$0",
    per: "forever",
    desc: "Get a feel for the platform. Limited projects, full access to drawing and quoting.",
    features: ["3 active projects", "Manual drawing & scale", "PDF quote export", "Community support"],
    cta: "Start free",
    featured: false,
  },
  {
    tier: "Pro",
    name: "Pro",
    price: "$49",
    per: "/ month",
    desc: "For active sole-trader floorers. Unlimited projects, smart optimisation, and your branding on every quote.",
    features: ["Unlimited projects", "Smart cut optimisation", "Custom branding & logo", "Material price book", "CSV & Excel exports"],
    cta: "Start 14-day trial",
    featured: true,
    badge: "Most popular",
  },
  {
    tier: "Team",
    name: "Enterprise",
    price: "Custom",
    per: "per team",
    desc: "For shops with multiple estimators. Shared price books, role-based access, and priority support.",
    features: ["Everything in Pro", "Multi-user team access", "Role-based permissions", "Shared price book & templates", "Priority support"],
    cta: "Talk to us",
    featured: false,
  },
];

export default function PricingSection() {
  const navigate = useNavigate();
  return (
    <section id="pricing" className="px-4 md:px-8 py-20 md:py-28 max-w-6xl mx-auto scroll-mt-24">
      <AnimateIn>
        <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground mb-4">Pricing</div>
        <h2 className="font-display text-[clamp(34px,4.5vw,56px)] font-black leading-[1.0] tracking-[-0.04em] text-foreground mb-4">
          Pay for itself<br />on the first quote.
        </h2>
        <p className="text-[17px] text-muted-foreground max-w-[480px] leading-[1.7] font-medium mb-14">
          One job won back from accurate cuts covers a year of Flooro. Start free, upgrade when it's earning.
        </p>
      </AnimateIn>
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[960px]">
        {plans.map((p) => (
          <StaggerItem key={p.name}>
            <div className={`border rounded-3xl p-8 flex flex-col relative h-full transition-shadow hover:shadow-lg ${
              p.featured ? "bg-foreground border-foreground/80 shadow-xl shadow-primary/10" : "bg-card border-border/50"
            }`}>
              {p.badge && (
                <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-black px-4 py-[3px] rounded-full whitespace-nowrap uppercase tracking-[0.04em]">{p.badge}</div>
              )}
              <div className={`text-[11px] font-extrabold uppercase tracking-[0.12em] mb-[6px] ${p.featured ? "text-background/40" : "text-muted-foreground"}`}>{p.tier}</div>
              <div className={`font-display text-2xl font-black tracking-tight mb-[6px] ${p.featured ? "text-background" : ""}`}>{p.name}</div>
              <div className="flex items-baseline gap-[3px] mb-[6px]">
                <span className={`font-display text-5xl font-black tracking-[-0.04em] leading-none ${p.featured ? "text-background" : ""}`}>{p.price}</span>
                <span className={`text-[15px] font-semibold ${p.featured ? "text-background/40" : "text-muted-foreground"}`}>{p.per}</span>
              </div>
              <div className={`text-[13px] font-medium leading-[1.65] mb-6 pb-6 border-b ${p.featured ? "text-background/50 border-background/10" : "text-muted-foreground border-border/40"}`}>{p.desc}</div>
              <ul className="flex-1 flex flex-col gap-[9px] mb-6">
                {p.features.map((f) => (
                  <li key={f} className={`text-[13px] font-semibold flex items-start gap-2 ${p.featured ? "text-background/70" : "text-foreground/70"}`}>
                    <span className={`font-black shrink-0 ${p.featured ? "text-primary" : "text-success"}`}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/auth")}
                className={`block text-center py-[13px] rounded-full text-sm font-extrabold transition-all ${
                  p.featured
                    ? "bg-primary text-primary-foreground hover:opacity-85 border-none"
                    : "bg-transparent border border-border/50 text-foreground hover:bg-cream-2"
                }`}
              >
                {p.cta}
              </button>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
