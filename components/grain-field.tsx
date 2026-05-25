"use client";

import { useEffect, useRef } from "react";

// Atmospheric grain field — fixed full-viewport canvas, pointer-events
// none, sits behind interactive content. Each particle rests at a "home"
// position with a faint random offset; the cursor repels nearby particles
// within REPEL_RADIUS, and a soft spring force pulls them back home.
// Tuned for ~60fps on commodity hardware via requestAnimationFrame.
//
// Honours prefers-reduced-motion (renders nothing).
// Pauses when the tab is hidden so we don't burn CPU in background.

type Particle = {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
};

// Tune-ables.
const DENSITY = 0.00026;         // particles per viewport pixel
const MAX_PARTICLES = 1000;
const REPEL_RADIUS = 120;        // px
const REPEL_STRENGTH = 0.95;
const SPRING = 0.045;            // pulls each particle back to its home
const DAMPING = 0.84;            // velocity decay each frame
const PARTICLE_COLOR_LIGHT = "20, 20, 18";    // warm near-black on greyish paper
const PARTICLE_COLOR_DARK = "240, 240, 235";  // warm near-white on near-black ink
const ALPHA_MIN = 0.22;
const ALPHA_RANGE = 0.55;        // → 0.22 – 0.77
const RADIUS_MIN = 0.6;
const RADIUS_RANGE = 1.6;        // → 0.6 – 2.2 px

export function GrainField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const canvas = el;

    // Bail if the user has asked for reduced motion.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const c2d = ctx;

    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let mouseX = -9999;
    let mouseY = -9999;
    let rafId = 0;
    let running = true;

    // Detect colour scheme without mutating state when it changes
    // (the .dark class can be added later via a theme toggle; just snapshot).
    const getParticleColor = (): string => {
      if (typeof document === "undefined") return PARTICLE_COLOR_LIGHT;
      const dark =
        document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      return dark ? PARTICLE_COLOR_DARK : PARTICLE_COLOR_LIGHT;
    };
    let color = getParticleColor();

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.max(1, window.devicePixelRatio || 1);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      c2d.setTransform(1, 0, 0, 1, 0, 0);
      c2d.scale(dpr, dpr);

      const desired = Math.min(MAX_PARTICLES, Math.floor(width * height * DENSITY));
      particles = new Array(desired).fill(null).map(() => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        return {
          baseX: x,
          baseY: y,
          x,
          y,
          vx: 0,
          vy: 0,
          r: RADIUS_MIN + Math.random() * RADIUS_RANGE,
          alpha: ALPHA_MIN + Math.random() * ALPHA_RANGE,
        };
      });
    };

    const frame = () => {
      if (!running) return;
      rafId = requestAnimationFrame(frame);

      c2d.clearRect(0, 0, width, height);

      const repelR2 = REPEL_RADIUS * REPEL_RADIUS;

      for (const p of particles) {
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const d2 = dx * dx + dy * dy;
        if (d2 < repelR2 && d2 > 0.5) {
          const d = Math.sqrt(d2);
          const fall = 1 - d / REPEL_RADIUS;
          const force = fall * fall * REPEL_STRENGTH;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }

        p.vx += (p.baseX - p.x) * SPRING;
        p.vy += (p.baseY - p.y) * SPRING;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        c2d.fillStyle = `rgba(${color}, ${p.alpha})`;
        c2d.beginPath();
        c2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c2d.fill();
      }
    };

    const onPointer = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const onPointerLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(rafId);
      } else if (!running) {
        running = true;
        frame();
      }
    };
    const onColorSchemeChange = () => {
      color = getParticleColor();
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    reduceMotion.addEventListener("change", () => {
      running = !reduceMotion.matches;
      if (running) frame();
      else cancelAnimationFrame(rafId);
    });
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    colorScheme.addEventListener("change", onColorSchemeChange);

    frame();

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      colorScheme.removeEventListener("change", onColorSchemeChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
