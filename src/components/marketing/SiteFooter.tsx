import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="px-4 md:px-8 py-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 max-w-6xl mx-auto">
      <Link to="/" className="flex items-center gap-2 text-base font-black text-foreground/40 tracking-tight font-display">
        <img src="/favicon.png" alt="Flooro" className="w-7 h-7 rounded-full opacity-60" />
        Flooro
      </Link>
      <div className="flex gap-6">
        <a href="#features" className="text-[13px] text-foreground/40 font-semibold hover:text-foreground/70 transition-colors">Features</a>
        <a href="#how" className="text-[13px] text-foreground/40 font-semibold hover:text-foreground/70 transition-colors">How it works</a>
        <a href="#pricing" className="text-[13px] text-foreground/40 font-semibold hover:text-foreground/70 transition-colors">Pricing</a>
        <a href="#faq" className="text-[13px] text-foreground/40 font-semibold hover:text-foreground/70 transition-colors">FAQ</a>
      </div>
      <div className="text-xs text-foreground/30 font-medium">© 2026 Flooro · flooro.com.au</div>
    </footer>
  );
}
