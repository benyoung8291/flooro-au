import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="min-h-screen bg-background">
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
