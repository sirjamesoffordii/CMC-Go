import { Badge } from "@/components/ui/badge";
import { Database, AlertCircle } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  isChecking?: boolean;
  error?: string;
}

export function ConnectionStatus({
  isConnected,
  isChecking = false,
  error,
}: ConnectionStatusProps) {
  if (isChecking) {
    return (
      <Badge variant="outline" className="gap-2">
        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        Checking...
      </Badge>
    );
  }

  if (isConnected) {
    return (
      <Badge variant="outline" className="gap-2 border-green-500/30 bg-green-500/10">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <Database className="w-3 h-3" />
        Connected
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-2">
      <AlertCircle className="w-3 h-3" />
      {error ? "Error" : "Disconnected"}
    </Badge>
  );
}
