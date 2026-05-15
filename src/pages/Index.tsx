import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import SiteNavbar from "@/components/marketing/SiteNavbar";
import SiteFooter from "@/components/marketing/SiteFooter";
import HeroSection from "@/components/marketing/HeroSection";
import FeaturesSection from "@/components/marketing/FeaturesSection";
import HowItWorksSection from "@/components/marketing/HowItWorksSection";
import PricingSection from "@/components/marketing/PricingSection";
import FaqSection from "@/components/marketing/FaqSection";
import CTAStrip from "@/components/marketing/CTAStrip";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  return (
    <div className="light min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Flooro — Flooring takeoff and quoting for contractors</title>
        <meta name="description" content="Draw floor plans, optimise cuts, and send client-ready quotes in minutes. The flooring estimation platform built for contractors." />
        <link rel="canonical" href="https://flooro.com.au/" />
        <meta property="og:title" content="Flooro — Flooring takeoff and quoting for contractors" />
        <meta property="og:description" content="Draw floor plans, optimise cuts, and send client-ready quotes in minutes." />
        <meta property="og:url" content="https://flooro.com.au/" />
      </Helmet>
      <SiteNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <div className="py-4" />
        <PricingSection />
        <FaqSection />
        <div className="py-4" />
        <CTAStrip />
      </main>
      <SiteFooter />
    </div>
  );
}
