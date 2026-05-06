"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

type ModalProps = {
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function Modal({
  trigger,
  title,
  description,
  children,
  className,
  open: controlledOpen,
  onOpenChange,
}: ModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, setOpen]);

  React.useEffect(() => {
    if (!open) return;
    contentRef.current?.focus();
  }, [open]);

  const triggerNode =
    trigger === undefined
      ? null
      : React.isValidElement(trigger)
        ? React.cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
            onClick: () => setOpen(true),
          })
        : (
          <button onClick={() => setOpen(true)} type="button">
            {trigger}
          </button>
        );

  return (
    <>
      {triggerNode}
      {open ? (
        <div
          aria-hidden={false}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            aria-describedby={description ? "modal-description" : undefined}
            aria-labelledby="modal-title"
            className={cn(
              "w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)]",
              className,
            )}
            onClick={(event) => event.stopPropagation()}
            ref={contentRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <h2 id="modal-title" className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
                  {title}
                </h2>
                {description ? (
                  <p id="modal-description" className="text-sm text-slate-600">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                aria-label="閉じる"
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
