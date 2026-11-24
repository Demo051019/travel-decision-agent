import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { LangToggle, useT } from '../i18n';
import ThemeToggle from '../components/ThemeToggle';
import styles from './AgentPage.module.css';

const AgentWorkspace = lazy(() => import('../features/agent/AgentWorkspace'));

export default function AgentPage() {
  const { t } = useT();

  return (
    <div className={styles.page}>
      {/* 放在 .stage 之外：stage 有入场动画的 transform，会让 fixed 后代相对它定位 */}
      <Link to="/" className={styles.back}>
        {t('nav.backToPortfolio')}
      </Link>

      <div className={styles.topControls}>
        <ThemeToggle />
        <LangToggle />
      </div>

      <Suspense
        fallback={
          <div className={styles.loading}>
            <span className={styles.spinner} />
            {t('agent.loading')}
          </div>
        }
      >
        <AgentWorkspace />
      </Suspense>
    </div>
  );
}
