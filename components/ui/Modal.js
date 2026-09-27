"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children, wide = false, level = 50 }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: level, paddingLeft: "max(1rem, var(--panel-offset, 0px))" }}
    >
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Kapat" onClick={onClose} />
      <div
        className={`relative flex max-h-[min(92dvh,100%)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl ${
          wide ? "w-[min(100%,48rem)]" : "w-[min(100%,32rem)]"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-zinc-100" aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
