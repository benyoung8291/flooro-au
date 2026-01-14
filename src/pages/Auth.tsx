import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Square, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

export default function Auth() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  // Sign up state
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailResult = emailSchema.safeParse(signInEmail);
    if (!emailResult.success) {
      toast({ title: 'Invalid email', description: emailResult.error.errors[0].message, variant: 'destructive' });
      return;
    }
    
    const passwordResult = passwordSchema.safeParse(signInPassword);
    if (!passwordResult.success) {
      toast({ title: 'Invalid password', description: passwordResult.error.errors[0].message, variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await signIn(signInEmail, signInPassword);
    setLoading(false);

    if (error) {
      let message = error.message;
      if (message.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please try again.';
      }
      toast({ title: 'Sign in failed', description: message, variant: 'destructive' });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nameResult = nameSchema.safeParse(signUpName);
    if (!nameResult.success) {
      toast({ title: 'Invalid name', description: nameResult.error.errors[0].message, variant: 'destructive' });
      return;
    }
    
    const emailResult = emailSchema.safeParse(signUpEmail);
    if (!emailResult.success) {
      toast({ title: 'Invalid email', description: emailResult.error.errors[0].message, variant: 'destructive' });
      return;
    }
    
    const passwordResult = passwordSchema.safeParse(signUpPassword);
    if (!passwordResult.success) {
      toast({ title: 'Invalid password', description: passwordResult.error.errors[0].message, variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await signUp(signUpEmail, signUpPassword, signUpName);
    setLoading(false);

    if (error) {
      let message = error.message;
      if (message.includes('User already registered')) {
        message = 'An account with this email already exists. Please sign in instead.';
      }
      toast({ title: 'Sign up failed', description: message, variant: 'destructive' });
    } else {
      toast({ title: 'Account created!', description: 'Welcome to Flooro.' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/favicon.png" alt="Flooro" className="w-10 h-10" />
          <span className="text-2xl font-semibold text-foreground">Flooro</span>
        </div>

        <Card className="glass-panel border-border/50">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-semibold">
              {tab === 'signin' ? 'Welcome back' : 'Create an account'}
            </CardTitle>
            <CardDescription>
              {tab === 'signin' 
                ? 'Sign in to your account to continue' 
                : 'Enter your details to get started'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'signin' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@company.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Smith"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@company.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Professional flooring estimation made simple.
        </p>
      </div>
    </div>
  );
}
