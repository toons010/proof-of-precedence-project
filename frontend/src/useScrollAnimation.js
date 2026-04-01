import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useParallax — bidirectional parallax.
 * Speed > 0: element moves down as you scroll down (slow background).
 * Speed < 0: element moves up as you scroll down (counter-scroll).
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
 * useScrollProgress — 0 when element enters viewport bottom, 1 when at viewport top.
 * Bidirectional: decreases again as you scroll back up.
 */
export function useScrollProgress() {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const wh = window.innerHeight;
      // 0 = element bottom at viewport bottom, 1 = element top at viewport top
      const raw = 1 - rect.bottom / (wh + rect.height);
      setProgress(Math.max(0, Math.min(1, raw)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return [ref, progress];
}

/**
 * useScrollReveal — adds/removes "revealed" class bidirectionally.
 * data-reveal="up|left|right|fade" on any element.
 * data-reveal-delay="200" for stagger in ms.
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
          e.target.classList.remove("revealed");
        }
      });
    }, { threshold, rootMargin: "-4% 0px -4% 0px" });
    els.forEach((el) => io.observe(el));
    return () => { io.disconnect(); timers.forEach(clearTimeout); };
  });
}

/**
 * useElementScroll — progress of element through viewport.
 * 0 = bottom of element at bottom of viewport
 * 0.5 = element centered in viewport
 * 1 = top of element at top of viewport
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