import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AnimateIn } from "./AnimateIn";

export default function CTAStrip() {
  const navigate = useNavigate();
  return (
    <div className="mx-4 md:mx-8 my-8 rounded-[32px] bg-foreground px-6 md:px-12 py-20 md:py-28 text-center">
      <AnimateIn>
        <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-background/30 mb-6">Ready when you are</div>
        <h2 className="font-display text-[clamp(34px,5vw,60px)] font-black leading-[1.0] tracking-[-0.04em] text-background mb-4">
          Stop guessing.<br /><span className="text-primary">Start quoting.</span>
        </h2>
        <p className="text-[17px] text-background/50 font-medium mb-4 max-w-lg mx-auto">
          Built by floorers who got tired of losing margin to bad math. <span className="text-background/80 font-bold">Free to try, no card required</span>, ready in under five minutes.
        </p>
        <p className="text-[13px] text-background/30 font-medium mb-12 max-w-md mx-auto">
          Open a project, draw a room, send a quote. That's the demo.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Button
            onClick={() => navigate("/auth")}
            className="rounded-full shadow-none border-none bg-primary text-primary-foreground font-extrabold text-[15px] px-7 py-[14px] h-auto hover:opacity-85"
          >
            Start your first project →
          </Button>
          <Button
            variant="outline"
            onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-full border-background/30 text-background bg-background/10 hover:bg-background/15 font-extrabold text-[15px] px-7 py-[14px] h-auto"
          >
            See pricing
          </Button>
        </div>
        <p className="mt-8 text-xs text-background/30 font-medium">Free plan forever. Pro from $49/month. No setup fees.</p>
      </AnimateIn>
    </div>
  );
}
