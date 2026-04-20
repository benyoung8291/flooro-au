import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function SiteNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { to: "#features", label: "Features" },
    { to: "#how", label: "How it works" },
    { to: "#pricing", label: "Pricing" },
    { to: "#faq", label: "FAQ" },
  ];

  return (
    <div className="sticky top-0 z-50 flex justify-center pt-3 px-4">
      <nav
        className={`flex items-center gap-1 px-2 py-1.5 rounded-full border transition-all duration-300 ${
          scrolled
            ? "bg-background/60 backdrop-blur-2xl border-foreground/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.06)]"
            : "bg-background/40 backdrop-blur-xl border-foreground/[0.05]"
        }`}
      >
        <Link to="/" className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight text-foreground pl-2.5 pr-1 font-display">
          <img src="/favicon.png" alt="Flooro" className="w-6 h-6 rounded-full" />
          <span className="hidden sm:inline">Flooro</span>
        </Link>

        <div className="hidden md:flex items-center">
          {links.map((l) => (
            <a
              key={l.to}
              href={l.to}
              className="text-[13px] font-semibold px-3 py-1.5 rounded-full transition-colors text-foreground/60 hover:text-foreground hover:bg-foreground/[0.04]"
            >
              {l.label}
            </a>
          ))}
        </div>

        <Button
          onClick={() => navigate("/auth")}
          className="rounded-full shadow-none border-none bg-primary text-primary-foreground font-extrabold text-[13px] px-4 py-1.5 h-auto hover:opacity-85 ml-1"
        >
          Start free
        </Button>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-1.5 text-foreground ml-0.5"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-14 bg-background/95 backdrop-blur-2xl z-40 px-6 pt-8">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <a key={l.to} href={l.to} onClick={() => setMobileOpen(false)} className="text-lg font-bold py-3 border-b border-border/40 text-foreground">
                {l.label}
              </a>
            ))}
            <Button onClick={() => navigate("/auth")} className="mt-4 w-full rounded-full bg-primary text-primary-foreground font-extrabold">
              Start free →
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}
