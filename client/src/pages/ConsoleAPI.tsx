// @ts-nocheck
// @ts-nocheck
import ConsoleLayout from "@/components/ConsoleLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Code, Send, Terminal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ConsoleAPI() {
  const [method, setMethod] = useState<
    "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  >("GET");
  const [endpoint, setEndpoint] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: endpoints } = trpc.console.apiEndpoints.list.useQuery();

  const handleSendRequest = async () => {
    if (!endpoint) {
      toast.error("Please enter an endpoint");
      return;
    }

    setIsLoading(true);
    setResponse("");

    try {
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (
        requestBody &&
        (method === "POST" || method === "PUT" || method === "PATCH")
      ) {
        try {
          JSON.parse(requestBody);
          options.body = requestBody;
        } catch {
          toast.error("Invalid JSON in request body");
          setIsLoading(false);
          return;
        }
      }

      const res = await fetch(endpoint, options);
      const data = await res.text();

      setResponse(
        JSON.stringify(
          {
            status: res.status,
            statusText: res.statusText,
            headers: Object.fromEntries(res.headers.entries()),
            body: data,
          },
          null,
          2
        )
      );

      if (res.ok) {
        toast.success("Request completed successfully");
      } else {
        toast.error(`Request failed with status ${res.status}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setResponse(JSON.stringify({ error: errorMessage }, null, 2));
      toast.error("Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const getMethodColor = (m: string) => {
    switch (m) {
      case "GET":
        return "text-blue-500";
      case "POST":
        return "text-green-500";
      case "PUT":
        return "text-yellow-500";
      case "DELETE":
        return "text-red-500";
      case "PATCH":
        return "text-purple-500";
      default:
        return "text-foreground";
    }
  };

  return (
    <ConsoleLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API Testing</h1>
          <p className="mt-2 text-muted-foreground">
            Test and debug API endpoints in real-time
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Endpoints
              </CardTitle>
              <Terminal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {endpoints?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Registered endpoints
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Public APIs</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {endpoints?.filter(e => e.isPublic).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Publicly accessible
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Protected APIs
              </CardTitle>
              <Code className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {endpoints?.filter(e => !e.isPublic).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Authentication required
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Request Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Request Builder</CardTitle>
            <CardDescription>
              Configure and send HTTP requests to test endpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="method">Method</Label>
                <Select value={method} onValueChange={v => setMethod(v as any)}>
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="endpoint">Endpoint URL</Label>
                <Input
                  id="endpoint"
                  placeholder="https://api.example.com/endpoint"
                  value={endpoint}
                  onChange={e => setEndpoint(e.target.value)}
                />
              </div>
            </div>

            {(method === "POST" || method === "PUT" || method === "PATCH") && (
              <div className="space-y-2">
                <Label htmlFor="body">Request Body (JSON)</Label>
                <Textarea
                  id="body"
                  placeholder='{"key": "value"}'
                  value={requestBody}
                  onChange={e => setRequestBody(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            )}

            <Button
              onClick={handleSendRequest}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Response */}
        {response && (
          <Card>
            <CardHeader>
              <CardTitle>Response</CardTitle>
              <CardDescription>Server response data</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-lg bg-muted p-4 text-sm text-foreground">
                {response}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Available Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle>Available Endpoints</CardTitle>
            <CardDescription>
              Registered API endpoints in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {endpoints && endpoints.length > 0 ? (
              <div className="space-y-3">
                {endpoints.map(ep => (
                  <div
                    key={ep.id}
                    className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-1 text-xs font-semibold ${getMethodColor(
                              ep.method
                            )}`}
                          >
                            {ep.method}
                          </span>
                          <code className="text-sm font-mono text-foreground">
                            {ep.path}
                          </code>
                          {ep.isPublic ? (
                            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
                              Public
                            </span>
                          ) : (
                            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-500">
                              Protected
                            </span>
                          )}
                        </div>
                        {ep.description && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {ep.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMethod(ep.method);
                          setEndpoint(ep.path);
                        }}
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Terminal className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No endpoints registered
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Endpoints will appear here once they are added to the system
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ConsoleLayout>
  );
}
