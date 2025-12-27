import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import FollowUp from "./pages/FollowUp";
import MoreInfo from "./pages/MoreInfo";
import AdminConsole from "./pages/AdminConsole";
import Approvals from "./pages/Approvals";
import Import from "./pages/Import";
import Needs from "./pages/Needs";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/follow-up" component={FollowUp} />
      <Route path="/more-info" component={MoreInfo} />
      <Route path="/admin" component={AdminConsole} />
      <Route path="/approvals" component={Approvals} />
      <Route path="/import" component={Import} />
      <Route path="/needs" component={Needs} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
