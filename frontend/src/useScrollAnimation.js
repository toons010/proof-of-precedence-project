import { useEffect, useRef, useState } from "react";

/**
 * useParallax — bidirectional parallax on any element.
 * speed > 0: element moves down as you scroll down (slow background).
 * speed < 0: element moves up as you scroll down (counter-scroll / Ferrari effect).
 */
export function useParallax(speed = 0.3) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      setOffset(center * speed);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [speed]);
  return [ref, offset];
}

/**
 * useElementScroll — progress of element through viewport.
 * 0 = bottom of element at bottom of viewport
 * 0.5 = element centred in viewport
 * 1 = top of element at top of viewport
 * BIDIRECTIONAL: value decreases when you scroll back up.
 */
export function useElementScroll() {
  const ref = useRef(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const wh = window.innerHeight;
      const total = wh + rect.height;
      const traveled = wh - rect.top;
      setP(Math.max(0, Math.min(1, traveled / total)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return [ref, p];
}

/**
 * useScrollReveal — FULLY BIDIRECTIONAL.
 * Uses continuous scroll position tracking (not IntersectionObserver threshold).
 * Elements with data-reveal get "revealed" class when in view, lose it when out.
 * Supports data-reveal-delay for stagger.
 */
export function useScrollReveal(threshold = 0.15) {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const timers = new Map();

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const delay = Number(e.target.dataset.revealDelay || 0);
        if (timers.has(e.target)) {
          clearTimeout(timers.get(e.target));
          timers.delete(e.target);
        }
        if (e.isIntersecting) {
          const t = setTimeout(() => e.target.classList.add("revealed"), delay);
          timers.set(e.target, t);
        } else {
          // Remove immediately on exit — enables retrace
          e.target.classList.remove("revealed");
        }
      });
    }, {
      threshold,
      // Tight rootMargin so the class is removed as soon as element exits viewport
      rootMargin: "-2% 0px -2% 0px",
    });

    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  });
}