import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stats = [
  { num: "30 sec", label: "From floor plan to estimate" },
  { num: "<3%", label: "Material waste with smart cuts" },
  { num: "Mobile", label: "Measure on-site, win on-site" },
  { num: "$0", label: "Free to start, pay when you win" },
];

export default function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className="px-4 md:px-8 pt-12 md:pt-20 pb-20 md:pb-28 relative overflow-hidden max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.5 }}>
        <div className="inline-flex items-center gap-2 bg-foreground text-background text-[13px] font-bold px-4 py-[7px] rounded-full mb-8">
          <div className="w-2 h-2 rounded-full bg-primary" />
          Built by floorers, for floorers. Not generic estimating software.
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.5 }}
        className="font-display text-[clamp(44px,7vw,88px)] font-black leading-[0.98] tracking-[-0.04em] text-foreground max-w-[850px] mb-7"
      >
        Measure faster.<br />
        <span className="bg-primary text-primary-foreground px-3 py-1 inline-block rounded-xl -rotate-1 my-1">Quote sharper.</span><br />
        Win more jobs.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-[clamp(16px,1.8vw,20px)] text-muted-foreground max-w-[600px] leading-[1.7] font-medium mb-12"
      >
        The flooring estimation platform that draws plans, optimises cuts, and generates client-ready quotes — all from your phone or laptop. Stop losing margin to bad math.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.5 }}
        className="flex items-center gap-3 flex-wrap mb-16"
      >
        <Button
          onClick={() => navigate("/auth")}
          className="rounded-full shadow-none border-none bg-primary text-primary-foreground font-extrabold text-[15px] px-7 py-[14px] h-auto hover:opacity-85"
        >
          Start your first takeoff →
        </Button>
        <Button
          variant="outline"
          onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
          className="rounded-full border-border/60 font-extrabold text-[15px] px-7 py-[14px] h-auto"
        >
          See how it works
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36, duration: 0.5 }}
        className="inline-grid grid-cols-2 md:grid-cols-4 bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden"
      >
        {stats.map((s, i) => (
          <div
            key={i}
            className={`px-7 py-5 text-center ${i < stats.length - 1 ? "border-r border-border/40" : ""} ${i === 1 ? "md:border-r max-md:border-r-0" : ""}`}
          >
            <div className="font-display text-[28px] font-black tracking-tight text-foreground leading-none">{s.num}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
