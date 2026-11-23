import { useEffect, useMemo, useRef, useState } from 'react';
import type { RawSseEvent } from '../api';
import { useT, type MessageKeys } from '../i18n';
import styles from './DebugPanel.module.css';

interface Props {
  events: RawSseEvent[];
  onClear: () => void;
}

type ViewMode = 'steps' | 'raw';

interface Step {
  id: string;
  icon: string;
  label: string;
  detail?: string;
  gapMs?: number;
}

const TOOL_META: Record<string, { icon: string; key: MessageKeys }> = {
  resolve_location: { icon: '📍', key: 'tool.locate' },
  search_nearby_malls: { icon: '🏬', key: 'tool.malls' },
  check_brands_in_malls: { icon: '🏷️', key: 'tool.brand' },
  rank_and_recommend: { icon: '🧭', key: 'tool.rank' },
};

function formatGap(ms: number): string {
  if (ms <= 0) return '';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export default function DebugPanel({ events, onClear }: Props) {
  const { t, lang } = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewMode>('steps');

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events, view]);

  // 把 SSE 事件翻译成人能读懂的步骤：工具调用 → 生成回答 → 完成。
  // 这是给演示看的视图；原始 JSON 仍保留在「原始数据」里给技术评审。
  const steps = useMemo<Step[]>(() => {
    type DraftStep = Step & { at: number };
    const list: DraftStep[] = [];
    let sawText = false;
    const gapTo = (at: number) => {
      const prev = list[list.length - 1];
      return prev ? at - prev.at : 0;
    };

    for (const evt of events) {
      if (evt.eventType === 'tool_called') {
        const name = (evt.data as { tool?: string } | null)?.tool ?? '';
        const meta = TOOL_META[name];
        list.push({
          id: `${evt.timestamp}-${list.length}`,
          icon: meta?.icon ?? '🔧',
          label: meta ? t(meta.key) : name || 'tool',
          detail: name,
          gapMs: gapTo(evt.timestamp),
          at: evt.timestamp,
        });
        continue;
      }

      if (evt.eventType === 'text_delta' && !sawText) {
        sawText = true;
        list.push({
          id: `${evt.timestamp}-answer`,
          icon: '✍️',
          label: t('debug.stepAnswer'),
          gapMs: gapTo(evt.timestamp),
          at: evt.timestamp,
        });
        continue;
      }

      if (evt.eventType === 'done' || evt.eventType === 'error') {
        const err = evt.data as { message?: string; status?: number } | null;
        list.push({
          id: `${evt.timestamp}-${evt.eventType}`,
          icon: evt.eventType === 'done' ? '✅' : '⚠️',
          label: evt.eventType === 'done' ? t('debug.stepDone') : t('debug.stepError'),
          // Surface the upstream status/reason here too, so diagnosing a
          // failure doesn't require switching to the raw JSON tab.
          detail: evt.eventType === 'error'
            ? [err?.status, err?.message].filter(Boolean).join(' · ')
            : undefined,
          gapMs: gapTo(evt.timestamp),
          at: evt.timestamp,
        });
      }
    }

    return list.map(({ at: _at, ...rest }) => rest);
  }, [events, t]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.dot} />
          <span className={styles.title}>{t('debug.title')}</span>
          <span className={styles.count}>
            {view === 'steps' ? `${steps.length} ${t('debug.stepCount')}` : `${events.length} ${t('debug.events')}`}
          </span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${view === 'steps' ? styles.tabActive : ''}`}
              onClick={() => setView('steps')}
            >
              {t('debug.tabSteps')}
            </button>
            <button
              className={`${styles.tab} ${view === 'raw' ? styles.tabActive : ''}`}
              onClick={() => setView('raw')}
            >
              {t('debug.tabRaw')}
            </button>
          </div>
          <button className={styles.clearBtn} onClick={onClear}>{t('debug.clear')}</button>
        </div>
      </div>

      <div className={styles.body} ref={scrollRef}>
        {view === 'steps' && steps.length === 0 && (
          <div className={styles.empty}>{t('debug.stepHint')}</div>
        )}

        {view === 'steps' && steps.length > 0 && (
          <div className={styles.steps}>
            {steps.map((step, i) => (
              <div key={step.id} className={styles.step}>
                <div className={styles.rail}>
                  <span className={styles.stepIndex}>{i + 1}</span>
                  {i < steps.length - 1 && <span className={styles.stepLine} />}
                </div>
                <div className={styles.stepBody}>
                  <div className={styles.stepTop}>
                    <span className={styles.stepLabel}>
                      <span className={styles.stepIcon}>{step.icon}</span>
                      {step.label}
                    </span>
                    {step.gapMs ? <span className={styles.stepGap}>+{formatGap(step.gapMs)}</span> : null}
                  </div>
                  {step.detail && <div className={styles.stepDetail}>{step.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'raw' && events.length === 0 && (
          <div className={styles.empty}>
            {t('debug.empty')}<br />
            {t('debug.emptyHint')}
          </div>
        )}

        {view === 'raw' && events.map((evt, i) => (
          <div key={`${evt.timestamp}-${i}`} className={styles.event}>
            <div className={styles.eventHeader}>
              <span className={`${styles.eventType} ${styles[`type_${evt.eventType}`] || styles.type_unknown}`}>
                {evt.eventType}
              </span>
              <span className={styles.eventTime}>
                {new Date(evt.timestamp).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
            <pre className={styles.eventData}>
              {evt.data !== null && typeof evt.data === 'object'
                ? JSON.stringify(evt.data, null, 2)
                : evt.raw}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
