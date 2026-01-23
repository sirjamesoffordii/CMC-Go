import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface HistoryItem {
  id: number;
  query: string;
  status: "success" | "error";
  executionTime: number;
  resultCount: number;
  createdAt: Date;
}

interface QueryHistorySidebarProps {
  history: HistoryItem[];
  onSelectQuery: (query: string) => void;
  onClearHistory?: () => void;
}

export function QueryHistorySidebar({
  history,
  onSelectQuery,
  onClearHistory,
}: QueryHistorySidebarProps) {
  const truncateQuery = (query: string, length: number = 50) => {
    return query.length > length ? query.substring(0, length) + "..." : query;
  };

  return (
    <div className="flex flex-col h-full bg-muted/30 border-r">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Query History</h3>
        </div>
        {history.length > 0 && onClearHistory && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={onClearHistory}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear History
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {history.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No query history yet
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {history.map(item => (
              <button
                key={item.id}
                onClick={() => onSelectQuery(item.query)}
                className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge
                    variant={
                      item.status === "success" ? "default" : "destructive"
                    }
                    className="text-xs"
                  >
                    {item.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground">
                    {format(new Date(item.createdAt), "HH:mm:ss")}
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground group-hover:text-foreground break-words">
                  {truncateQuery(item.query)}
                </p>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{item.executionTime}ms</span>
                  <span>•</span>
                  <span>{item.resultCount} rows</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
