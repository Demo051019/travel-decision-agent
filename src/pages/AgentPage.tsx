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
        <AgentWorkspace
          leading={
            <Link to="/" className={styles.back}>
              {t('nav.backToPortfolio')}
            </Link>
          }
        />
      </Suspense>
    </div>
  );
}
