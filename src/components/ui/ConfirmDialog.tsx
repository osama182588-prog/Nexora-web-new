"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className={cn(
          "glass-strong relative w-full max-w-md animate-fade-in rounded-2xl p-6 shadow-glow"
        )}
      >
        <h2
          id="confirm-dialog-title"
          className="font-display text-lg font-semibold text-white"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-slate-400">{description}</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "primary" : "primary"}
            size="sm"
            loading={loading}
            onClick={onConfirm}
            className={
              destructive
                ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_0_24px_rgba(244,63,94,0.4)] hover:brightness-110"
                : ""
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
