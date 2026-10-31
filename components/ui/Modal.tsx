"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

type Token = { overlay: HTMLElement | null };

// Open modals, oldest first. Only the last one reacts to Esc and stays interactive.
const stack: Token[] = [];
const inerted = new Set<Element>();
let savedOverflow = "";

function syncInert() {
  const top = stack[stack.length - 1];
  for (const child of Array.from(document.body.children)) {
    const isTop = !!top?.overlay && child === top.overlay;
    if (!top || isTop) {
      if (inerted.delete(child)) child.removeAttribute("inert");
    } else if (!child.hasAttribute("inert")) {
      child.setAttribute("inert", "");
      inerted.add(child);
    }
  }
  if (!top) inerted.clear();
}

function pushModal(token: Token) {
  if (stack.length === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  stack.push(token);
  syncInert();
}

function popModal(token: Token) {
  const i = stack.indexOf(token);
  if (i >= 0) stack.splice(i, 1);
  if (token.overlay) inerted.delete(token.overlay);
  if (stack.length === 0) document.body.style.overflow = savedOverflow;
  syncInert();
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open || !mounted) return;
    const token: Token = { overlay: overlayRef.current };
    pushModal(token);
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    const items = () => Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    (items()[0] ?? dialog)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const list = items();
      if (list.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      popModal(token);
      previous?.focus();
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(35,31,77,0.45)] p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-md rounded-card bg-white p-6 text-ink shadow-[0_6px_20px_rgba(102,117,232,0.10)] outline-none"
      >
        <h2 id={titleId} className="mb-3 font-display text-xl font-bold">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
