"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function AnchoredMenu({ open, anchorRef, onClose, children, footer = null, align = "start", width = 0 }) {
  const [style, setStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open) return undefined;

    function place() {
      const node = anchorRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < spaceAbove;
      const maxHeight = Math.max(96, (openUp ? spaceAbove : spaceBelow) - 12);
      const menuWidth = width || rect.width;
      const preferredLeft = align === "end" ? rect.right - menuWidth : rect.left;
      const left = Math.max(8, Math.min(preferredLeft, window.innerWidth - menuWidth - 8));
      setStyle({
        left,
        width: menuWidth,
        maxHeight,
        ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, align, width]);

  if (!open || !style || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button type="button" className="fixed inset-0 z-[70] cursor-default" aria-label="Kapat" onClick={onClose} />
      <div
        className="fixed z-[80] flex flex-col overflow-hidden rounded-xl border border-line bg-white p-2 shadow-lg"
        style={style}
      >
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        {footer}
      </div>
    </>,
    document.body
  );
}
