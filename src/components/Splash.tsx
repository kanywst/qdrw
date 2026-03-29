import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ColorScheme } from '../types';

interface SplashProps {
  colorScheme: ColorScheme;
  onEnter: () => void;
}

const mono = "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace";

export function Splash({ colorScheme, onEnter }: SplashProps) {
  const isDark = colorScheme === 'dark';
  const fg = isDark ? '#f2f2f2' : '#1a1a1a';
  const bg = isDark ? '#141414' : '#fafafa';
  const muted = isDark ? 'rgba(242,242,242,0.35)' : 'rgba(26,26,26,0.35)';
  const border = isDark ? 'rgba(242,242,242,0.08)' : 'rgba(26,26,26,0.08)';

  // Blinking cursor
  const [cursor, setCursor] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setCursor((v) => !v), 530);
    return () => clearInterval(t);
  }, []);

  // Enter on keydown (any key) or click
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      onEnter();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEnter]);

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      onClick={onEnter}
      style={{
        position: 'fixed',
        inset: 0,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 100,
        userSelect: 'none',
      }}
    >
      {/* Logo / title */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{ textAlign: 'center' }}
      >
        <div style={{
          fontFamily: mono,
          fontSize: 'clamp(48px, 10vw, 96px)',
          fontWeight: 500,
          letterSpacing: '-0.04em',
          color: fg,
          lineHeight: 1,
          marginBottom: '16px',
        }}>
          qdrw
        </div>

        <div style={{
          fontFamily: mono,
          fontSize: 'clamp(11px, 1.5vw, 13px)',
          color: muted,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '48px',
        }}>
          open → draw → paste into AI
        </div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '64px',
          }}
        >
          {['zero friction', 'auto-crop', 'clipboard', 'no backend'].map((tag) => (
            <span key={tag} style={{
              fontFamily: mono,
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: muted,
              border: `1px solid ${border}`,
              borderRadius: '9999px',
              padding: '4px 10px',
            }}>
              {tag}
            </span>
          ))}
        </motion.div>

        {/* Enter prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          style={{
            fontFamily: mono,
            fontSize: '12px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: muted,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center',
          }}
        >
          <span>press any key to start</span>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '14px',
            background: muted,
            opacity: cursor ? 1 : 0,
            transition: 'opacity 0.1s',
            borderRadius: '1px',
          }} />
        </motion.div>
      </motion.div>

      {/* Subtle grid background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(${border} 1px, transparent 1px), linear-gradient(90deg, ${border} 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
        maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 100%)',
      }} />
    </motion.div>
  );
}
