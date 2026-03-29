import { useState } from 'react';
import { Pencil, Eraser, Copy, Trash2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ActiveTool, StrokeWidth, ColorScheme } from '../types';

interface ToolbarProps {
  activeTool: ActiveTool;
  strokeWidth: StrokeWidth;
  isDrawing: boolean;
  colorScheme: ColorScheme;
  onToolChange: (tool: ActiveTool) => void;
  onWidthChange: (width: StrokeWidth) => void;
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
}

const STROKE_DOT_SIZE: Record<StrokeWidth, number> = {
  S: 6,
  M: 10,
  L: 14,
};

const toolbarStyle: React.CSSProperties = {
  background: 'var(--color-toolbar-bg)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid oklch(100% 0 0 / 0.08)',
  borderRadius: '9999px',
  boxShadow:
    '0 0 0 0.5px oklch(0% 0 0 / 0.05), 0 4px 24px oklch(0% 0 0 / 0.15), inset 0 1px 0 oklch(100% 0 0 / 0.12)',
  padding: '6px 10px',
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
};

const dividerStyle: React.CSSProperties = {
  width: '1px',
  height: '20px',
  background: 'oklch(50% 0 0 / 0.3)',
  margin: '0 4px',
  flexShrink: 0,
};

const baseButtonStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--color-toolbar-icon)',
  padding: 0,
  flexShrink: 0,
};

const activeButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  background: 'var(--color-active-bg)',
  color: 'var(--color-active-icon)',
  boxShadow: 'inset 0 0 0 1px oklch(95% 0 0 / 0.15)',
};

const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 12px)',
  right: 0,
  background: 'var(--color-toolbar-bg)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid oklch(100% 0 0 / 0.08)',
  borderRadius: '12px',
  boxShadow:
    '0 0 0 0.5px oklch(0% 0 0 / 0.05), 0 4px 24px oklch(0% 0 0 / 0.15), inset 0 1px 0 oklch(100% 0 0 / 0.12)',
  padding: '10px 14px',
  whiteSpace: 'nowrap',
  fontFamily: "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
  fontSize: '10px',
  opacity: 0.5,
  color: 'var(--color-active-icon)',
  lineHeight: '1.8',
  pointerEvents: 'none',
};

export function Toolbar({
  activeTool,
  strokeWidth,
  isDrawing,
  onToolChange,
  onWidthChange,
  onCopy,
  onDownload,
  onClear,
}: ToolbarProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        x: '-50%',
        zIndex: 50,
      }}
      animate={{ opacity: isDrawing ? 0.12 : 1, y: isDrawing ? 4 : 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <div style={toolbarStyle}>
        {/* Brush button */}
        <button
          style={activeTool === 'brush' ? activeButtonStyle : baseButtonStyle}
          onClick={() => onToolChange('brush')}
          title="Brush (B)"
          aria-label="Brush tool"
          aria-pressed={activeTool === 'brush'}
        >
          {activeTool === 'brush' && (
            <motion.div
              layoutId="active-tool-indicator"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '6px',
                background: 'var(--color-active-bg)',
                boxShadow: 'inset 0 0 0 1px oklch(95% 0 0 / 0.15)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <Pencil size={16} style={{ position: 'relative', zIndex: 1 }} />
        </button>

        {/* Eraser button */}
        <button
          style={activeTool === 'eraser' ? activeButtonStyle : baseButtonStyle}
          onClick={() => onToolChange('eraser')}
          title="Eraser (E)"
          aria-label="Eraser tool"
          aria-pressed={activeTool === 'eraser'}
        >
          {activeTool === 'eraser' && (
            <motion.div
              layoutId="active-tool-indicator"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '6px',
                background: 'var(--color-active-bg)',
                boxShadow: 'inset 0 0 0 1px oklch(95% 0 0 / 0.15)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <Eraser size={16} style={{ position: 'relative', zIndex: 1 }} />
        </button>

        <div style={dividerStyle} />

        {/* Stroke width dots */}
        {(['S', 'M', 'L'] as StrokeWidth[]).map((w) => (
          <button
            key={w}
            style={{
              ...baseButtonStyle,
              width: '28px',
              height: '28px',
            }}
            onClick={() => onWidthChange(w)}
            title={`Stroke width ${w}`}
            aria-label={`Stroke width ${w}`}
            aria-pressed={strokeWidth === w}
          >
            <motion.div
              animate={{ scale: strokeWidth === w ? 1.3 : 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 25 }}
              style={{
                width: STROKE_DOT_SIZE[w],
                height: STROKE_DOT_SIZE[w],
                borderRadius: '50%',
                background:
                  strokeWidth === w
                    ? 'var(--color-active-icon)'
                    : 'var(--color-toolbar-icon)',
              }}
            />
          </button>
        ))}

        <div style={dividerStyle} />

        {/* Copy button */}
        <button
          style={baseButtonStyle}
          onClick={onCopy}
          title="Copy (C)"
          aria-label="Copy to clipboard"
        >
          <Copy size={16} />
        </button>

        {/* Download button */}
        <button
          style={baseButtonStyle}
          onClick={onDownload}
          title="Download PNG (S)"
          aria-label="Download as PNG"
        >
          <Download size={16} />
        </button>

        {/* Clear button */}
        <button
          style={baseButtonStyle}
          onClick={onClear}
          title="Clear (⇧C)"
          aria-label="Clear canvas"
        >
          <Trash2 size={16} />
        </button>

        <div style={dividerStyle} />

        {/* Help button */}
        <div style={{ position: 'relative' }}>
          <button
            style={{
              ...baseButtonStyle,
              fontFamily: "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-toolbar-icon)',
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            aria-label="Keyboard shortcuts"
          >
            ?
          </button>

          <AnimatePresence>
            {showTooltip && (
              <motion.div
                style={tooltipStyle}
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 0.5, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <div>B&nbsp;&nbsp;brush&nbsp;&nbsp;&nbsp;&nbsp;E&nbsp;&nbsp;eraser</div>
                <div>Z&nbsp;&nbsp;undo&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;C&nbsp;&nbsp;copy</div>
                <div>S&nbsp;&nbsp;save&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[&nbsp;&nbsp;thinner</div>
                <div>]&nbsp;&nbsp;thicker&nbsp;&nbsp;⇧C&nbsp;clear</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
