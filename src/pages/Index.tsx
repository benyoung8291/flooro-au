import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowRight, Ruler, Calculator, Users } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="Flooro" className="w-9 h-9" />
            <span className="text-xl font-semibold text-foreground">Flooro</span>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Ruler className="w-4 h-4" />
            Professional Flooring Estimation
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 max-w-4xl mx-auto leading-tight">
            Measure smarter.
            <br />
            <span className="text-primary">Estimate faster.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The modern platform for flooring professionals. Draw floor plans, calculate materials, 
            and generate quotes — all in one powerful tool.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything you need for flooring estimation
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From measuring floor plans to generating professional quotes, 
              Flooro handles it all with precision.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Ruler className="w-6 h-6" />}
              title="Precision Measurement"
              description="Draw rooms with magnetic snapping and automatic dimension calculations. Support for polygonal rooms, cut-outs, and complex layouts."
            />
            <FeatureCard 
              icon={<Calculator className="w-6 h-6" />}
              title="Smart Calculations"
              description="Automatic roll cutting optimization, tile count with waste factors, and pattern matching for professional results."
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6" />}
              title="Team Collaboration"
              description="Work together in real-time. Share projects, manage team permissions, and streamline your workflow."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to transform your estimation workflow?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join flooring professionals who trust Flooro for accurate measurements and faster quotes.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Get Started for Free
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="Flooro" className="w-7 h-7" />
            <span className="font-semibold text-foreground">Flooro</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Flooro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
