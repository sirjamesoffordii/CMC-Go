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
import EventInfo from "./pages/EventInfo";
import WhyInvitationsMatter from "./pages/WhyInvitationsMatter";
import Donate from "./pages/Donate";
import { lazy, Suspense, useEffect } from "react";

// Lazy-load less-used routes for smaller initial bundle
const AdminConsole = lazy(() => import("./pages/AdminConsole"));
const Approvals = lazy(() => import("./pages/Approvals"));
const Import = lazy(() => import("./pages/Import"));
const Needs = lazy(() => import("./pages/Needs"));
const FollowUpView = lazy(() => import("./pages/FollowUpView"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Invite = lazy(() => import("./pages/Invite"));

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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      }
    >
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/people" component={People} />
        <Route path="/follow-up" component={FollowUpView} />
        <Route path="/event-info" component={EventInfo} />
        <Route path="/what-is-cmc-go" component={WhyInvitationsMatter} />
        <Route path="/donate" component={Donate} />
        <Route path="/admin" component={AdminConsole} />
        <Route path="/approvals" component={Approvals} />
        <Route path="/import" component={Import} />
        <Route path="/needs" component={Needs} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/invite" component={Invite} />
        <Route path="/404" component={NotFound} />
        <Route path="/app-auth" component={AppAuthRedirect} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// Routes that don't require authentication
const PUBLIC_ROUTES = new Set([
  "/login",
  "/app-auth",
  "/what-is-cmc-go",
  "/event-info",
  "/donate",
  "/invite",
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
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-sm"
          >
            Skip to content
          </a>
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
