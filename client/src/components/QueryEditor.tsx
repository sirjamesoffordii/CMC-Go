import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  isExecuting?: boolean;
  placeholder?: string;
}

export function QueryEditor({
  value,
  onChange,
  onExecute,
  isExecuting = false,
  placeholder = "SELECT * FROM table_name;",
}: QueryEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);

  useEffect(() => {
    const lines = value.split("\n").length;
    setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onExecute();
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + "\t" + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const lineNumbersDiv = document.getElementById("line-numbers");
    if (lineNumbersDiv) {
      lineNumbersDiv.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">
          SQL Query
        </label>
        <span className="text-xs text-muted-foreground">
          Ctrl+Enter to execute
        </span>
      </div>

      <div className="border rounded-lg overflow-hidden bg-background">
        <div className="flex">
          <div
            id="line-numbers"
            className="bg-muted/50 border-r p-3 text-right text-xs text-muted-foreground font-mono select-none overflow-hidden"
            style={{ width: "50px" }}
          >
            {lineNumbers.map((num) => (
              <div key={num} className="h-6 leading-6">
                {num}
              </div>
            ))}
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              placeholder={placeholder}
              className="w-full p-3 font-mono text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
              style={{ minHeight: "200px" }}
              spellCheck="false"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={onExecute}
        disabled={isExecuting || !value.trim()}
        className="w-full"
        size="lg"
      >
        {isExecuting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Executing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Execute Query
          </>
        )}
      </Button>
    </div>
  );
}
