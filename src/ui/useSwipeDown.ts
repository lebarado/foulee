import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

/**
 * « Glisser vers le bas pour fermer », comme les feuilles iOS / Android.
 * - Ne démarre que si le contenu est tout en haut (sinon le doigt fait défiler normalement).
 * - Verrouille la direction : un geste horizontal (curseur, chips qui défilent) n'est jamais capturé.
 * - Ferme si on tire assez loin ou assez vite, sinon la feuille revient en place.
 */
export function useSwipeDown<T extends HTMLElement>(onClose: () => void, backdrop?: RefObject<HTMLElement>) {
  const ref = useRef<T>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let mode: 'idle' | 'pending' | 'drag' | 'ignore' = 'idle';
    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let lastT = 0;
    let dy = 0;
    let velocity = 0;

    const place = (y: number, animate: boolean) => {
      const ease = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.3, 1)';
      el.style.transition = animate ? ease : 'none';
      el.style.transform = y > 0 ? `translateY(${y}px)` : '';
      const bg = backdrop?.current;
      if (bg) {
        bg.style.transition = animate ? 'opacity 0.22s ease-out' : 'none';
        bg.style.opacity = String(1 - Math.min(y / Math.max(el.offsetHeight, 1), 1) * 0.9);
      }
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return void (mode = 'ignore');
      const t = e.touches[0];
      const target = e.target as HTMLElement;
      // Curseurs, zones de texte et éléments marqués gardent leur propre geste.
      if (target.closest('input[type="range"], textarea, .no-swipe')) return void (mode = 'ignore');
      startX = t.clientX;
      startY = lastY = t.clientY;
      lastT = e.timeStamp;
      dy = 0;
      velocity = 0;
      mode = el.scrollTop <= 0 ? 'pending' : 'ignore';
    };

    const onMove = (e: TouchEvent) => {
      if (mode !== 'pending' && mode !== 'drag') return;
      const t = e.touches[0];
      const ddx = t.clientX - startX;
      const ddy = t.clientY - startY;
      if (mode === 'pending') {
        if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
        if (ddy > 0 && Math.abs(ddy) > Math.abs(ddx)) mode = 'drag';
        else return void (mode = 'ignore');
      }
      e.preventDefault(); // on tient la feuille : pas de défilement ni de rafraîchissement de page
      dy = Math.max(0, ddy);
      const dt = e.timeStamp - lastT;
      if (dt > 0) velocity = (t.clientY - lastY) / dt;
      lastY = t.clientY;
      lastT = e.timeStamp;
      place(dy, false);
    };

    const onEnd = () => {
      const dragging = mode === 'drag';
      mode = 'idle';
      if (!dragging) return;
      const far = dy > Math.min(140, el.offsetHeight * 0.25);
      const fast = velocity > 0.6 && dy > 30;
      if (far || fast) {
        place(el.offsetHeight + 40, true);
        setTimeout(() => close.current(), 200);
      } else {
        place(0, true);
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  return ref;
}
