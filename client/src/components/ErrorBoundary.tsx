import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Component, ReactNode } from "react";
import * as Sentry from "@sentry/react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Always log to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Capture to Sentry if available (browser SDK)
    try {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    } catch (sentryError) {
      // Sentry might not be initialized, that's okay
      console.error("Failed to capture error to Sentry:", sentryError);
    }
  }

  handleGoHome = () => {
    // Safely navigate to home using window.location
    window.location.assign("/");
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6 text-center">
              An unexpected error occurred. You can try going home or reloading
              the page.
            </p>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6 max-h-64">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.stack}
              </pre>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleGoHome}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <Home size={16} />
                Go Home
              </button>
              <button
                onClick={this.handleReload}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-secondary text-secondary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
