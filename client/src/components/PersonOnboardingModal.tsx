import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  defaultName: string;
  onComplete: () => void;
};

export function PersonOnboardingModal({ open, defaultName, onComplete }: Props) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(defaultName);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setQuery(defaultName);
  }, [open, defaultName]);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  const suggestionsQuery = trpc.auth.personSuggestions.useQuery(
    { query: normalizedQuery },
    { enabled: open && normalizedQuery.length >= 2 }
  );

  const setPersonMutation = trpc.auth.setPerson.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      onComplete();
    },
  });

  const createAndLinkMutation = trpc.auth.createAndLinkPerson.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      onComplete();
    },
  });

  const isBusy =
    suggestionsQuery.isFetching ||
    setPersonMutation.isPending ||
    createAndLinkMutation.isPending;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Who are you?</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This links your login to a person record so we can keep your scope and edits consistent.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Your name</label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setQuery(e.target.value);
              }}
              placeholder="Type your name"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Suggestions</div>

            {normalizedQuery.length < 2 ? (
              <div className="text-sm text-muted-foreground">Type at least 2 characters.</div>
            ) : suggestionsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            ) : suggestionsQuery.data && suggestionsQuery.data.length > 0 ? (
              <div className="max-h-60 overflow-auto rounded-md border">
                {suggestionsQuery.data.map((p) => (
                  <button
                    key={p.personId}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => setPersonMutation.mutate({ personId: p.personId })}
                    disabled={isBusy}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.personId}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No matches found.</div>
            )}

            {suggestionsQuery.error && (
              <div className="text-sm text-destructive">{suggestionsQuery.error.message}</div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => createAndLinkMutation.mutate({ name: name.trim() || defaultName })}
              disabled={isBusy}
            >
              {createAndLinkMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                </span>
              ) : (
                "Create new person"
              )}
            </Button>
          </div>

          {(setPersonMutation.error || createAndLinkMutation.error) && (
            <div className="text-sm text-destructive">
              {(setPersonMutation.error ?? createAndLinkMutation.error)?.message}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
