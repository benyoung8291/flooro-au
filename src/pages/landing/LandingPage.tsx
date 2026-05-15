import { useNavigate, Link, Navigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SiteNavbar from "@/components/marketing/SiteNavbar";
import SiteFooter from "@/components/marketing/SiteFooter";
import CTAStrip from "@/components/marketing/CTAStrip";
import { AnimateIn, StaggerContainer, StaggerItem } from "@/components/marketing/AnimateIn";
import { LANDING_CONFIGS, LANDING_SLUGS, type LandingConfig } from "./landingConfigs";

const RELATED_LABELS: Record<string, string> = {
  "flooring-estimating-software": "Flooring estimating software",
  "flooring-takeoff-software": "Flooring takeoff software",
  "carpet-estimating-software": "Carpet estimating software",
  "vinyl-flooring-calculator": "Vinyl flooring calculator",
};

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const config = slug ? LANDING_CONFIGS[slug] : undefined;
  if (!config) return <Navigate to="/" replace />;
  return <LandingPageInner config={config} />;
}

function LandingPageInner({ config }: { config: LandingConfig }) {
  const navigate = useNavigate();
  const url = `https://flooro.com.au/${config.slug}`;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://flooro.com.au/" },
      { "@type": "ListItem", position: 2, name: config.keyword, item: url },
    ],
  };

  return (
    <div className="light min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{config.title}</title>
        <meta name="description" content={config.description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={config.title} />
        <meta property="og:description" content={config.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <SiteNavbar />

      <main>
        {/* Hero */}
        <section className="px-4 md:px-8 pt-12 md:pt-20 pb-16 md:pb-24 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-foreground text-background text-[13px] font-bold px-4 py-[7px] rounded-full mb-8">
              <div className="w-2 h-2 rounded-full bg-primary" />
              {config.badge}
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="font-display text-[clamp(40px,6.5vw,80px)] font-black leading-[0.98] tracking-[-0.04em] text-foreground max-w-[850px] mb-7"
          >
            {config.h1Lines.map((line, i) => (
              <span key={i}>
                {i === 1 ? (
                  <span className="bg-primary text-primary-foreground px-3 py-1 inline-block rounded-xl -rotate-1 my-1">{line}</span>
                ) : (
                  line
                )}
                {i < config.h1Lines.length - 1 && <br />}
              </span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4 }}
            className="text-[clamp(16px,1.7vw,19px)] text-muted-foreground max-w-[640px] leading-[1.7] font-medium mb-10"
          >
            {config.intro}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.5 }}
            className="flex items-center gap-3 flex-wrap"
          >
            <Button
              onClick={() => navigate("/auth")}
              className="rounded-full shadow-none border-none bg-primary text-primary-foreground font-extrabold text-[15px] px-7 py-[14px] h-auto hover:opacity-85"
            >
              Start free →
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full border-border/60 font-extrabold text-[15px] px-7 py-[14px] h-auto"
            >
              See features
            </Button>
          </motion.div>
        </section>

        {/* Features */}
        <section id="features" className="px-4 md:px-8 py-16 md:py-24 max-w-6xl mx-auto scroll-mt-24">
          <AnimateIn>
            <h2 className="font-display text-[clamp(30px,4vw,48px)] font-black leading-[1.05] tracking-[-0.04em] text-foreground max-w-[600px] mb-12">
              Why contractors switch to Flooro
            </h2>
          </AnimateIn>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {config.features.map((f) => (
              <StaggerItem key={f.title}>
                <article className="bg-card border border-border/40 rounded-3xl p-7 h-full">
                  <h3 className="font-display text-[17px] font-extrabold tracking-tight text-foreground mb-3">{f.title}</h3>
                  <p className="text-[13px] text-foreground/60 leading-[1.6] font-medium">{f.desc}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-4 md:mx-8 rounded-[32px] bg-cream-2/80 backdrop-blur-xl px-6 md:px-12 py-16 md:py-24 scroll-mt-24">
          <div className="max-w-3xl mx-auto">
            <AnimateIn>
              <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground mb-4">FAQ</div>
              <h2 className="font-display text-[clamp(30px,4vw,48px)] font-black leading-[1.05] tracking-[-0.04em] text-foreground mb-10">
                Common questions
              </h2>
            </AnimateIn>
            <Accordion type="single" collapsible className="space-y-3">
              {config.faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="bg-card border border-border/40 rounded-2xl px-5 data-[state=open]:shadow-sm">
                  <AccordionTrigger className="font-display text-[15px] font-extrabold tracking-tight text-left hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[14px] text-foreground/70 leading-[1.7] font-medium pb-5">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Related */}
        <section className="px-4 md:px-8 py-16 max-w-6xl mx-auto">
          <AnimateIn>
            <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground mb-4">More from Flooro</div>
            <div className="flex flex-wrap gap-3">
              {LANDING_SLUGS.filter((s) => s !== config.slug).map((s) => (
                <Link
                  key={s}
                  to={`/${s}`}
                  className="inline-flex items-center gap-2 bg-card border border-border/40 rounded-full px-5 py-2 text-[13px] font-extrabold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  {RELATED_LABELS[s]} →
                </Link>
              ))}
            </div>
          </AnimateIn>
        </section>

        <CTAStrip />
      </main>

      <SiteFooter />
    </div>
  );
}