import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from '../data/projects';
import ProjectCard from './ProjectCard';
import styles from './ProjectFlipbook.module.css';

interface Props {
  projects: Project[];
}

interface Incoming {
  index: number;
  dir: 1 | -1;
}

/** 自动轮播间隔 */
const AUTO_MS = 5000;

/**
 * 作品轮播：每 5 秒自动切换到下一件，也支持点按钮手动翻。
 * 过渡是淡入 + 轻微位移，不做 3D 翻页。
 */
export default function ProjectFlipbook({ projects }: Props) {
  const total = projects.length;
  const [index, setIndex] = useState(0);
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const lockRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const settle = useCallback((next: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setIndex(next);
    setIncoming(null);
    lockRef.current = false;
  }, []);

  const turn = useCallback(
    (dir: 1 | -1) => {
      if (lockRef.current || incoming || total < 2) return;
      lockRef.current = true;
      const next = (index + dir + total) % total;
      setIncoming({ index: next, dir });
      // 兜底：动画事件没触发时也要复位
      timerRef.current = window.setTimeout(() => settle(next), 900);
    },
    [incoming, index, settle, total],
  );

  // 每 5 秒自动前进；手动翻页会因 turn 变化而重置计时
  useEffect(() => {
    if (total < 2) return;
    const id = window.setInterval(() => turn(1), AUTO_MS);
    return () => window.clearInterval(id);
  }, [turn, total]);

  if (total === 0) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        {/* 所有卡片都保留在网格里占位，保证切换时高度不跳动 */}
        {projects.map((p, i) => (
          <div
            key={p.slug}
            className={styles.page}
            aria-hidden={i !== index}
            style={{ visibility: i === index ? 'visible' : 'hidden' }}
          >
            <ProjectCard project={p} />
          </div>
        ))}

        {incoming && (
          <div
            key={`${incoming.index}-${incoming.dir}-${index}`}
            className={`${styles.top} ${
              incoming.dir === 1 ? styles.inNext : styles.inPrev
            }`}
            onAnimationEnd={() => settle(incoming.index)}
          >
            <ProjectCard project={projects[incoming.index]} />
          </div>
        )}
      </div>

      {total > 1 && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => turn(-1)}
            aria-label="上一个作品"
          >
            ‹
          </button>

          <span className={styles.counter}>
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>

          <div className={styles.dots} aria-hidden="true">
            {projects.map((p, i) => (
              <span
                key={p.slug}
                className={`${styles.dot} ${i === index ? styles.dotOn : ''}`}
              />
            ))}
          </div>

          <button
            type="button"
            className={styles.navBtn}
            onClick={() => turn(1)}
            aria-label="下一个作品"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
