import { useEffect, useRef } from 'react';

/** Bottom sheet on phones, centred dialog from 640px up. Closes on Escape,
 *  on backdrop tap, and traps focus while open. */
export default function Sheet({ open, title, onClose, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll(
        'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector('input, select, button')?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      body.style.overflow = prevOverflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
      >
        <div className="sheet__grip" />
        <h2 className="sheet__title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
