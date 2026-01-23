import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { SentryTestRedirect } from "./components/SentryTestRedirect";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import People from "./pages/People";
import MoreInfo from "./pages/MoreInfo";
import WhyInvitationsMatter from "./pages/WhyInvitationsMatter";
import AdminConsole from "./pages/AdminConsole";
import Approvals from "./pages/Approvals";
import Import from "./pages/Import";
import Needs from "./pages/Needs";
import FollowUpView from "./pages/FollowUpView";
import { Login } from "./pages/Login";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/">
        {params => {
          try {
            return <Home />;
          } catch (error) {
            console.error("[Router] Error rendering Home component:", error);
            return (
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-4">
                    Error Loading Home Page
                  </h1>
                  <p className="text-gray-600 mb-4">
                    {error instanceof Error ? error.message : "Unknown error"}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            );
          }
        }}
      </Route>
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
      <Route path="/app-auth">
        {() => {
          const [, setLocation] = useLocation();

          useEffect(() => {
            // Handle OAuth redirect
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get("redirect");

            if (redirect) {
              // If redirect is a full URL, use window.location
              if (
                redirect.startsWith("http://") ||
                redirect.startsWith("https://")
              ) {
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
        }}
      </Route>
      <Route>
        {params => {
          return <NotFound />;
        }}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <SentryTestRedirect />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
