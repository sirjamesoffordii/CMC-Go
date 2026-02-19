import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

interface MessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  personName: string;
}

export function MessageDialog({
  open,
  onOpenChange,
  personId,
  personName,
}: MessageDialogProps) {
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();

  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      toast.success("Message sent! They'll see it in the app.");
      setMessage("");
      onOpenChange(false);
      utils.notes.byPerson.invalidate({ personId });
    },
    onError: error => {
      toast.error(error.message || "Failed to send message");
    },
  });

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Please enter a message");
      return;
    }
    createNote.mutate({
      personId,
      content: trimmed,
      noteType: "MESSAGE",
      category: "INTERNAL",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Message {personName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Your message will appear in their app when they check their
            messages.
          </p>
          <div className="space-y-2">
            <Label htmlFor="message-content">Message</Label>
            <Textarea
              id="message-content"
              placeholder="Type your message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createNote.isPending || !message.trim()}
          >
            {createNote.isPending ? "Sending..." : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
