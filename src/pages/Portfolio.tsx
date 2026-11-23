import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { liveProjects, hasDrafts } from '../data/projects';
import { site } from '../data/site';
import ProjectCard from '../components/ProjectCard';
import styles from './Portfolio.module.css';

/**
 * Anchor links only fire on hash *change*, so clicking 作品 twice does nothing.
 * Scroll explicitly and update the hash without jumping.
 */
function jumpTo(id: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  };
}

export default function Portfolio() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <a href="#top" className={styles.brand} aria-label="回到顶部">
            <span className={styles.brandMark}>D</span>
            <span className={styles.brandName}>
              Demo
              <span className={styles.brandDivider}>/</span>
              <span className={styles.brandSub}>作品集</span>
            </span>
          </a>

          <nav className={styles.navLinks} aria-label="主导航">
            <a href="#work" onClick={jumpTo('work')}>作品</a>
            <a href="#about" onClick={jumpTo('about')}>关于</a>
            <a href="#contact" onClick={jumpTo('contact')}>联系</a>
            <a
              href={site.github}
              target="_blank"
              rel="noreferrer"
              className={styles.navGithub}
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>
              {site.location} · {site.role} · {site.cohort}
            </p>
            <h1 className={styles.headline}>
              把数据变成
              <br />
              <span className={styles.accent}>能用的判断。</span>
            </h1>
            <p className={styles.lead}>
              我是 Demo，大三在读。做过一个能查实时路况的出行决策 Agent，也做数据清洗与分析。
              比起堆功能，我更在意答案能不能直接拿来用。
            </p>

            <div className={styles.actions}>
              <a href="#work" onClick={jumpTo('work')} className={styles.btnPrimary}>
                看作品 ↓
              </a>
              <Link to="/agent" className={styles.btnGhost}>
                试玩 Agent ↗
              </Link>
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>4</span>
                <span className={styles.statLabel}>工具协同</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>5 步</span>
                <span className={styles.statLabel}>可观测链路</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>实时</span>
                <span className={styles.statLabel}>路况判断</span>
              </div>
            </div>
          </div>
        </section>

        <section id="work" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionIndex}>01</span>
              <span className={styles.sectionTitle}>精选作品</span>
              <span className={styles.sectionLine} />
              <span className={styles.sectionCount}>
                {liveProjects.length} 个项目
              </span>
            </div>

            <div className={styles.workList}>
              {liveProjects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>

            {hasDrafts && (
              <p className={styles.note}>
                还有两个项目在整理数据和截图，补齐后会出现在这里。
              </p>
            )}
          </div>
        </section>

        <section id="about" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionIndex}>02</span>
              <span className={styles.sectionTitle}>关于</span>
              <span className={styles.sectionLine} />
            </div>

            <div className={styles.aboutGrid}>
              <p className={styles.aboutLead}>
                先跑通最小闭环，
                <br />
                再补可观测性和边界情况。
              </p>

              <div className={styles.aboutText}>
                <p>
                  大数据技术专业，日常用 <strong>Python / SQL / Pandas</strong>{' '}
                  做数据清洗和分析，也写 <strong>React + TypeScript</strong>{' '}
                  做前端。最近一年主要在折腾 Agent：工具调用、SSE 流式、把每一步暴露出来。
                </p>
                <p>
                  做出行 Agent 时，路况没有简单判成「堵 / 不堵」，而是按畅通、缓行、拥堵的
                  <strong>里程占比</strong>计算，未知路段不计入分母。这类细节决定了答案能不能用。
                </p>

                <div className={styles.skills}>
                  <div className={styles.skillGroup}>
                    <h4>数据</h4>
                    <p>Python · SQL · Pandas · 数据清洗</p>
                  </div>
                  <div className={styles.skillGroup}>
                    <h4>前端</h4>
                    <p>React · TypeScript · CSS Modules · Vite</p>
                  </div>
                  <div className={styles.skillGroup}>
                    <h4>AI</h4>
                    <p>Agents SDK · 工具调用 · SSE · Prompt</p>
                  </div>
                  <div className={styles.skillGroup}>
                    <h4>工程</h4>
                    <p>Git · EdgeOne Pages · 云函数 · 高德 API</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className={styles.sectionContact}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>03 · 联系</p>
            <h2 className={styles.contactTitle}>
              有实习机会，
              <br />
              或者只是想聊聊？
            </h2>
            <p className={styles.contactLead}>
              我更习惯用代码和结果说话。想看看源码，或者想要一份简历，直接找我。
            </p>

            <div className={styles.contactActions}>
              <a
                href={site.github}
                target="_blank"
                rel="noreferrer"
                className={styles.btnPrimary}
              >
                GitHub ↗
              </a>
              {site.email && (
                <a href={`mailto:${site.email}`} className={styles.btnGhost}>
                  发邮件 →
                </a>
              )}
              {site.resume && (
                <a href={site.resume} className={styles.btnGhost}>
                  简历 PDF ↓
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <span>© 2026 Demo · 用 React + EdgeOne 搭的</span>
          <span>{site.location}</span>
        </div>
      </footer>
    </div>
  );
}
