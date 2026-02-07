import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthGate } from "./components/AuthGate";
import { SentryTestRedirect } from "./components/SentryTestRedirect";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import People from "./pages/People";
import { Login } from "./pages/Login";
import MoreInfo from "./pages/MoreInfo";
import WhyInvitationsMatter from "./pages/WhyInvitationsMatter";
import AdminConsole from "./pages/AdminConsole";
import Approvals from "./pages/Approvals";
import Import from "./pages/Import";
import Needs from "./pages/Needs";
import FollowUpView from "./pages/FollowUpView";
import { useEffect } from "react";

function AppAuthRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Handle OAuth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get("redirect");

    if (redirect) {
      // If redirect is a full URL, use window.location
      if (redirect.startsWith("http://") || redirect.startsWith("https://")) {
        window.location.href = redirect;
      } else {
        // Otherwise, use router navigation
        setLocation(redirect);
      }
    } else {
      // If no redirect param, go to home
      setLocation("/");
    }
  }, [setLocation]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/people" component={People} />
      <Route path="/follow-up" component={FollowUpView} />
      <Route path="/more-info" component={MoreInfo} />
      <Route path="/why-invitations-matter" component={WhyInvitationsMatter} />
      <Route path="/admin" component={AdminConsole} />
      <Route path="/approvals" component={Approvals} />
      <Route path="/import" component={Import} />
      <Route path="/needs" component={Needs} />
      <Route path="/404" component={NotFound} />
      <Route path="/app-auth" component={AppAuthRedirect} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Routes that don't require authentication
const PUBLIC_ROUTES = new Set([
  "/login",
  "/app-auth",
  "/why-invitations-matter",
  "/more-info",
  "/404",
]);

function App() {
  const [location] = useLocation();
  const isPublicRoute = PUBLIC_ROUTES.has(location);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <SentryTestRedirect />
          {isPublicRoute ? (
            <Router />
          ) : (
            <AuthGate>
              <Router />
            </AuthGate>
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
