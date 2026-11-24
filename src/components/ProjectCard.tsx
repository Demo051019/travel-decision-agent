import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '../data/projects';
import styles from './ProjectCard.module.css';

interface Props {
  project: Project;
}

export default function ProjectCard({ project }: Props) {
  return (
    <article className={styles.card}>
      <div
        className={styles.cover}
        style={{ '--accent': project.accent } as CSSProperties}
      >
        {project.cover ? (
          <img
            className={styles.image}
            src={project.cover}
            alt={`${project.title} 预览`}
            loading="lazy"
          />
        ) : (
          <div className={styles.fallback} aria-hidden="true">
            <span className={styles.kicker}>{project.kicker}</span>
            <span className={styles.index}>{project.index}</span>
          </div>
        )}
      </div>

      <div className={styles.body}>
        <p className={styles.meta}>
          {project.year} · {project.role}
        </p>
        <h3 className={styles.title}>{project.title}</h3>
        <p className={styles.subtitle}>{project.subtitle}</p>
        <p className={styles.summary}>{project.summary}</p>

        <div className={styles.metrics}>
          {project.metrics.map((m) => (
            <div key={m.label} className={styles.metric}>
              <span className={styles.metricValue}>{m.value}</span>
              <span className={styles.metricLabel}>{m.label}</span>
            </div>
          ))}
        </div>

        <ul className={styles.stack}>
          {project.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        {project.links.length > 0 && (
          <div className={styles.links}>
            {project.links.map((link) => {
              const cls = link.primary ? styles.primary : styles.link;

              // 站内 SPA 路由
              if (link.href.startsWith('/') && !link.external) {
                return (
                  <Link key={link.href} to={link.href} className={cls}>
                    {link.label} →
                  </Link>
                );
              }

              // 站内独立 HTML 保持同窗口；站外链接开新标签
              const sameTab = Boolean(link.external);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target={sameTab ? undefined : '_blank'}
                  rel={sameTab ? undefined : 'noreferrer'}
                  className={cls}
                >
                  {link.label} {sameTab ? '→' : '↗'}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
