import { AnimatePresence, motion } from 'motion/react';

interface ToastProps {
  message: string;
  visible: boolean;
}

const toastStyle: React.CSSProperties = {
  background: 'var(--color-toolbar-bg)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid oklch(100% 0 0 / 0.08)',
  borderRadius: '9999px',
  padding: '8px 16px',
  fontFamily: "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-active-icon)',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 24px oklch(0% 0 0 / 0.15)',
  pointerEvents: 'none',
};

export function Toast({ message, visible }: ToastProps) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2" style={{ pointerEvents: 'none' }}>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            style={toastStyle}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
