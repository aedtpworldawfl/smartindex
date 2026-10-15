/**
 * ============================================================
 *  AEDTP WORLD ADVERTISE — MAGIC EFFECTS
 *  Lightweight, dependency-free particle + floating-text engine
 *  used on generated /ads/*.html pages.
 * ============================================================
 */
(function (window) {
  'use strict';

  const AedtpMagic = {};

  /* ---------------------------------------------------------
   * PARTICLES (magic_effect)
   * Simple canvas particle field, capped for performance.
   * ------------------------------------------------------- */
  AedtpMagic.startParticles = function (opts) {
    opts = opts || {};
    const count = Math.min(opts.count || 40, 60); // hard cap to avoid lag

    const canvas = document.createElement('canvas');
    canvas.id = 'aedtp-particle-canvas';
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');

    let w, h, particles;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.2 + 0.6,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      a: Math.random() * 0.5 + 0.2,
    }));

    let rafId;
    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165,180,252,${p.a})`;
        ctx.fill();
      }
      rafId = requestAnimationFrame(tick);
    }
    tick();

    // Pause when tab is hidden — saves battery/CPU
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        tick();
      }
    });
  };

  /* ---------------------------------------------------------
   * FLOATING TEXT (magic_text)
   * Moves each pre-rendered .floating-text div along a gentle
   * pseudo-random drifting path. Capped at 20 items server-side.
   * ------------------------------------------------------- */
  AedtpMagic.startFloatingText = function (texts) {
    const nodes = document.querySelectorAll('.floating-text');
    if (!nodes.length) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    nodes.forEach((node, i) => {
      // Random starting position
      let x = Math.random() * (w - 120);
      let y = Math.random() * (h - 60);
      let vx = (Math.random() - 0.5) * 0.6;
      let vy = (Math.random() - 0.5) * 0.6;
      const driftSeed = Math.random() * 1000;

      node.style.left = x + 'px';
      node.style.top = y + 'px';
      node.style.opacity = (0.5 + Math.random() * 0.5).toFixed(2);

      function animate(t) {
        // Gentle sinusoidal drift so text floats rather than flies straight
        x += vx + Math.sin((t + driftSeed) / 900) * 0.3;
        y += vy + Math.cos((t + driftSeed) / 1100) * 0.3;

        if (x < -50) x = w;
        if (x > w) x = -50;
        if (y < -30) y = h;
        if (y > h) y = -30;

        node.style.transform = `translate(${x}px, ${y}px)`;
        requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    });
  };

  /* ---------------------------------------------------------
   * IMAGE FALLBACK HELPER (used inline via onerror= in HTML too)
   * ------------------------------------------------------- */
  AedtpMagic.hideOnError = function (imgEl) {
    if (imgEl && imgEl.parentElement) {
      imgEl.parentElement.remove();
    }
  };

  window.AedtpMagic = AedtpMagic;
})(window);
