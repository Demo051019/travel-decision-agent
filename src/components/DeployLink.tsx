import { useState } from 'react';
import { useT } from '../i18n';

/**
 * 本项目在 EdgeOne Makers 的控制台项目 ID。
 * 项目类型是 Git 集成（push 到 main 自动构建部署），所以不存在"一键部署
 * 某个模板"的 URL——部署由本仓库的提交触发。这个角标指向本项目的部署记录，
 * 而不是 starter 模板的新建项目页。
 */
const PROJECT_ID = 'makers-t9sghy2qvgjc';
const DEPLOY_CONSOLE_URL = `https://console.cloud.tencent.com/edgeone/makers/project/${PROJECT_ID}/deployments`;

/**
 * Floating rocket badge that opens this project's deployment console.
 * Pinned to the left of the GitHub badge in the bottom-right viewport
 * corner. A localised tooltip floats above the badge on hover/focus.
 */
export default function DeployLink() {
  const [hover, setHover] = useState(false);
  const { t } = useT();
  const label = t('floatingLink.deploy');

  return (
    <a
      href={DEPLOY_CONSOLE_URL}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        position: 'fixed',
        right: 60,
        bottom: 16,
        zIndex: 50,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '50%',
        color: hover ? '#e5e7eb' : '#9ca3af',
        background: hover ? 'rgba(15,23,42,0.55)' : 'transparent',
        boxShadow: hover ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
        transition: 'color 160ms ease, background 160ms ease, box-shadow 160ms ease',
        textDecoration: 'none',
      }}
    >
      <span
        role='tooltip'
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '4px 8px',
          borderRadius: 4,
          background: 'rgba(229,231,235,0.95)',
          color: '#0f172a',
          fontSize: 12,
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: hover ? 1 : 0,
          transition: 'opacity 140ms ease',
        }}
      >
        {label}
      </span>
      <svg
        viewBox='0 0 24 24'
        width={22}
        height={22}
        fill='none'
        stroke='currentColor'
        strokeWidth={1.8}
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
      >
        <path d='M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z' />
        <path d='M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z' />
        <path d='M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0' />
        <path d='M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' />
      </svg>
    </a>
  );
}
