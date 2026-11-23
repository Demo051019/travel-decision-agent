import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { LangToggle } from '../i18n';
import styles from './AgentPage.module.css';

const AgentWorkspace = lazy(() => import('../features/agent/AgentWorkspace'));

export default function AgentPage() {
  return (
    <div className={styles.page}>
      <LangToggle />

      <Suspense
        fallback={
          <div className={styles.loading}>
            <span className={styles.spinner} />
            加载工作台…
          </div>
        }
      >
        <AgentWorkspace />
      </Suspense>

      <Link to="/" className={styles.back}>
        ← 作品集
      </Link>
    </div>
  );
}
