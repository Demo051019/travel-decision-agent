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
            {project.links.map((link) =>
              link.href.startsWith('/') ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className={link.primary ? styles.primary : styles.link}
                >
                  {link.label} →
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className={link.primary ? styles.primary : styles.link}
                >
                  {link.label} ↗
                </a>
              )
            )}
          </div>
        )}
      </div>
    </article>
  );
}
