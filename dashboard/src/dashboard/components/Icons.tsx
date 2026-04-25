import type { CSSProperties } from 'react';

type IconProps = { size?: number; style?: CSSProperties };

export function IconChevron({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

export function IconChevronL({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M10 4L6 8l4 4" />
    </svg>
  );
}

export function IconDownload({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M8 2v8M5 7l3 3 3-3M3 13h10" />
    </svg>
  );
}

export function IconCheck({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M3 8l4 4 6-7" />
    </svg>
  );
}

export function IconAlert({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={style}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7v3" strokeWidth="2" />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconDoc({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M4 2h5l3 3v9H4V2z" />
      <path d="M9 2v3h3M6 8h4M6 11h3" />
    </svg>
  );
}
