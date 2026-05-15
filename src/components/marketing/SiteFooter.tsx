import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="px-4 md:px-8 py-12 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div>
          <Link to="/" className="flex items-center gap-2 text-base font-black text-foreground tracking-tight font-display">
            <img src="/favicon.png" alt="Flooro" className="w-7 h-7 rounded-full" />
            Flooro
          </Link>
          <p className="mt-3 text-[12px] text-foreground/60 font-medium leading-[1.6] max-w-[220px]">
            Flooring takeoff and quoting for Australian contractors.
          </p>
        </div>
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-foreground/50 mb-3">Product</div>
          <ul className="space-y-2 text-[13px]">
            <li><a href="/#features" className="text-foreground/70 font-semibold hover:text-foreground transition-colors">Features</a></li>
            <li><a href="/#how" className="text-foreground/70 font-semibold hover:text-foreground transition-colors">How it works</a></li>
            <li><a href="/#pricing" className="text-foreground/70 font-semibold hover:text-foreground transition-colors">Pricing</a></li>
            <li><a href="/#faq" className="text-foreground/70 font-semibold hover:text-foreground transition-colors">FAQ</a></li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-foreground/50 mb-3">Solutions</div>
          <ul className="space-y-2 text-[13px]">
            <li><Link to="/flooring-estimating-software" className="text-foreground/70 font-semibold hover:text-foreground transition-colors">Flooring estimating software</Link></li>
            <li><Link to="/flooring-takeoff-software" className="text-foreground/70 font-semibold hover:text-foreground transition-colors">Flooring takeoff software</Link></li>
            <li><Link to="/carpet-estimating-software" className="text-foreground/70 font-semibold hover:text-foreground transition-colors">Carpet estimating software</Link></li>
            <li><Link to="/vinyl-flooring-calculator" className="text-foreground/70 font-semibold hover:text-foreground transition-colors">Vinyl flooring calculator</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-foreground/50 mb-3">Account</div>
          <ul className="space-y-2 text-[13px]">
            <li><Link to="/auth" className="text-foreground/70 font-semibold hover:text-foreground transition-colors">Sign in</Link></li>
            <li><Link to="/auth" className="text-foreground/70 font-semibold hover:text-foreground transition-colors">Start free</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/40 pt-6 flex flex-col md:flex-row justify-between gap-2 text-xs text-foreground/60 font-medium">
        <div>© 2026 Flooro · flooro.com.au</div>
        <div>
          Site built by{" "}
          <a
            href="https://fromtheoffice.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
          >
            fromtheoffice.io
          </a>
        </div>
      </div>
    </footer>
  );
}
