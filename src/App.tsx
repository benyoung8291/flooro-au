import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import NewProject from "./pages/NewProject";
import ProjectEditor from "./pages/ProjectEditor";
import Materials from "./pages/Materials";
import PriceBook from "./pages/PriceBook";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Organizations from "./pages/admin/Organizations";
import QuotesList from "./pages/QuotesList";
import QuoteEditor from "./pages/QuoteEditor";
// QuotePreview is now inline via QuotePdfSidebar
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                {/* Full-screen pages — outside AppLayout */}
                <Route path="/projects/:projectId" element={<ProjectEditor />} />
                <Route path="/projects/:projectId" element={<ProjectEditor />} />

                {/* App shell with sidebar */}
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/projects/new" element={<NewProject />} />
                  <Route path="/materials" element={<Materials />} />
                  <Route path="/price-book" element={<PriceBook />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/quotes" element={<QuotesList />} />
                  <Route path="/quotes/:quoteId" element={<QuoteEditor />} />
                </Route>

                {/* Admin Routes */}
                <Route element={<AdminRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/admin" element={<Admin />}>
                      <Route path="organizations" element={<Organizations />} />
                    </Route>
                  </Route>
                </Route>
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
