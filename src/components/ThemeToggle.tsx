import { useTheme } from '../lib/theme';
import styles from './ThemeToggle.module.css';

interface Props {
  className?: string;
}

export default function ThemeToggle({ className }: Props) {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? '浅色' : '深色';

  return (
    <button
      type="button"
      className={`${styles.button} ${className ?? ''}`}
      onClick={toggle}
      aria-label={`切换到${next}模式`}
      title={`切换到${next}模式`}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
