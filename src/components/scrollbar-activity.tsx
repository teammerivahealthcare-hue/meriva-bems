"use client";

import { useEffect } from "react";

// How long a scrollbar stays visible after the last scroll event.
const HIDE_DELAY_MS = 900;

/**
 * Marks whichever element is scrolling with data-scrolling, and clears it
 * shortly after scrolling stops. globals.css keys the scrollbar thumb off
 * that attribute, so table scrollbars only show while in motion.
 * Scroll events don't bubble, so one capture-phase listener on document
 * covers the page and every nested scroll container.
 */
export function ScrollbarActivity() {
  useEffect(() => {
    const timers = new Map<Element, number>();

    function onScroll(event: Event) {
      const el = event.target === document ? document.documentElement : event.target;
      if (!(el instanceof Element)) return;

      el.setAttribute("data-scrolling", "");
      window.clearTimeout(timers.get(el));
      timers.set(
        el,
        window.setTimeout(() => {
          el.removeAttribute("data-scrolling");
          timers.delete(el);
        }, HIDE_DELAY_MS),
      );
    }

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return null;
}
