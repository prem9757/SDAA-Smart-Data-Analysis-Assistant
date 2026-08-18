import React, { useEffect } from 'react';

export const GlobalClickRipple: React.FC = () => {
  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const handleClick = (e: MouseEvent) => {
      // Look for clickable targets
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest('button, a, input, select, [role="button"], [role="tab"], .interactive-click');
      if (!interactive) return;

      const ripple = document.createElement('div');
      ripple.className = 'click-ripple';

      const diameter = 30;
      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;
      ripple.style.left = `${e.clientX - diameter / 2}px`;
      ripple.style.top = `${e.clientY - diameter / 2}px`;

      document.body.appendChild(ripple);

      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 500);
    };

    window.addEventListener('click', handleClick, { passive: true });
    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return null;
};
