import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface StatusChangeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: "Yes" | "Maybe" | "No" | "Not Invited";
  newStatus: "Yes" | "Maybe" | "No" | "Not Invited";
  personName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StatusChangeConfirmationDialog({
  open,
  onOpenChange,
  currentStatus,
  newStatus,
  personName,
  onConfirm,
  onCancel,
}: StatusChangeConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
          <AlertDialogDescription>
            {personName ? (
              <>
                Are you sure you want to change <strong>{personName}</strong>'s
                status?
              </>
            ) : (
              "Are you sure you want to change this person's status?"
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4 p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Current</div>
              <div className="font-semibold text-lg">{currentStatus}</div>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">New</div>
              <div className="font-semibold text-lg">{newStatus}</div>
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
