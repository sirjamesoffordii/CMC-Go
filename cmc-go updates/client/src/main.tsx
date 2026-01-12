import { trpc } from "@/lib/trpc";
import { getTrpcUrl } from "@/lib/apiConfig";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { toast } from "sonner";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  // Authentication disabled - don't redirect to login
  return;
};

// PR 6: Friendly error handling with toasts
const getErrorMessage = (error: unknown): string => {
  if (error instanceof TRPCClientError) {
    // User-friendly messages for common errors
    if (error.data?.code === "UNAUTHORIZED") {
      return "Please log in to continue";
    }
    if (error.data?.code === "FORBIDDEN") {
      return "You don't have permission to perform this action";
    }
    if (error.data?.code === "TOO_MANY_REQUESTS") {
      return "Too many requests. Please try again later.";
    }
    if (error.data?.code === "CONFLICT") {
      return error.message || "This resource already exists";
    }
    // Return the error message if it's user-friendly, otherwise generic message
    return error.message || "An error occurred. Please try again.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    
    // PR 6: Show user-friendly toast instead of console.error
    const message = getErrorMessage(error);
    if (message !== UNAUTHED_ERR_MSG) {
      toast.error(message);
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    
    // PR 6: Show user-friendly toast instead of console.error
    const message = getErrorMessage(error);
    if (message !== UNAUTHED_ERR_MSG) {
      toast.error(message);
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getTrpcUrl(),
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// Initialize React app with error handling
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found. Make sure there's a <div id='root'></div> in the HTML.");
  }

  createRoot(rootElement).render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
} catch (error) {
  console.error("Failed to initialize React app:", error);
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1>Application Error</h1>
        <p>Failed to initialize the application. Please check the browser console for details.</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
      </div>
    `;
  }
}
