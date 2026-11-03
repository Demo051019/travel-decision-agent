import type React from 'react';
import styles from './CodeViewer.module.css';

/* ── Token factory ── */
const token = (cls: string) =>
  function Token({ t }: { t: string }) { return <span className={cls}>{t}</span>; };

const Cmt = token(styles.cmt);
const Dec = token(styles.dec);
const Kw  = token(styles.kw);
const Fn  = token(styles.fn);
const Ty  = token(styles.ty);
const Str = token(styles.str);
const Doc = token(styles.doc);
const Op  = token(styles.op);
const Va  = token(styles.va);

interface LineProps { n: number; children?: React.ReactNode }
const L = ({ n, children }: LineProps) => (
  <div className={styles.line}>
    <span className={styles.ln}>{String(n).padStart(2, ' ')}</span>
    <span className={styles.lc}>{children ?? ' '}</span>
  </div>
);

/* Indent helpers */
const I1 = ({ children }: { children?: React.ReactNode }) => (
  <><span className={styles.indent} />{children}</>
);
const I2 = ({ children }: { children?: React.ReactNode }) => (
  <><span className={styles.indent} /><span className={styles.indent} />{children}</>
);

export default function CodeViewer() {
  return (
    <div className={styles.panel}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.fileIcon}>⬡</span>
          <span className={styles.filename}>handler.py</span>
        </div>
        <span className={styles.badge}>READ ONLY</span>
      </div>

      {/* ── Code body ── */}
      <div className={styles.body}>
        {/* CRT scanline overlay */}
        <div className={styles.scanline} aria-hidden />

        <div className={styles.code}>
          {/* ── Imports ── */}
          <L n={1}><Kw t="from " /><Va t="openai" /><Kw t=" import " /><Ty t="AsyncOpenAI" /></L>
          <L n={2}><Kw t="from " /><Va t="agents" /><Kw t=" import " /><Ty t="Agent" /><Op t=", " /><Ty t="OpenAIChatCompletionsModel" /><Op t=", " /><Ty t="Runner" /><Op t=", " /><Dec t="function_tool" /></L>
          <L n={3} />

          {/* ── 1. Tool definition ── */}
          <L n={4}><Cmt t="# 1. Define tools with @function_tool" /></L>
          <L n={5}><Dec t="@function_tool" /></L>
          <L n={6}>
            <Kw t="async def " /><Fn t="resolve_location" /><Op t="(" />
            <Va t="address" /><Op t=": " /><Ty t="Annotated" /><Op t="[" />
            <Ty t="str" /><Op t=", " /><Str t='"用户说的地点"' />
            <Op t="]) -> " /><Ty t="str" /><Op t=":" />
          </L>
          <L n={7}>
            <I1><Doc t='"""地点 → 经纬度；有歧义时返回 need_clarification 追问。"""' /></I1>
          </L>
          <L n={8}>
            <I1><Cmt t="# 调高德 geocode，Key 只从环境变量读取" /></I1>
          </L>
          <L n={9} />
          <L n={10}>
            <Va t="TOOLS" /><Op t=" = [" /><Fn t="resolve_location" /><Op t=", " /><Fn t="search_nearby_malls" /><Op t=", ...]" />
          </L>
          <L n={11} />

          {/* ── 2. Handler ── */}
          <L n={12}>
            <Kw t="async def " /><Fn t="handler" /><Op t="(" /><Va t="context" /><Op t="):" />
          </L>
          <L n={13}>
            <I1><Va t="message" /><Op t=" = " /><Va t="context" /><Op t="." /><Va t="request" /><Op t="." /><Va t="body" /><Op t="." /><Fn t="get" /><Op t="(" /><Str t='"message"' /><Op t=", " /><Str t='""' /><Op t=")" /></I1>
          </L>
          <L n={14}>
            <I1><Va t="conversation_id" /><Op t=" = " /><Va t="context" /><Op t="." /><Va t="conversation_id" /></I1>
          </L>
          <L n={15}>
            <I1><Va t="store" /><Op t=" = " /><Va t="context" /><Op t="." /><Va t="store" /></I1>
          </L>
          <L n={16} />

          {/* ── 3. Store: save user message ── */}
          <L n={17}>
            <I1><Cmt t="# 2. Store: save user message for history" /></I1>
          </L>
          <L n={18}>
            <I1><Kw t="await " /><Va t="store" /><Op t="." /><Fn t="append_message" /><Op t="(" /><Va t="conversation_id" /><Op t=", " /><Str t='"user"' /><Op t=", " /><Va t="message" /><Op t=")" /></I1>
          </L>
          <L n={19} />

          {/* ── 4. Store: inject session memory ── */}
          <L n={20}>
            <I1><Cmt t="# 3. Store: inject OpenAI Agents SDK session memory" /></I1>
          </L>
          <L n={21}>
            <I1><Va t="session" /><Op t=" = " /><Va t="store" /><Op t="." /><Fn t="openai_session" /><Op t="(" /><Va t="conversation_id" /><Op t=")" /></I1>
          </L>
          <L n={22} />

          {/* ── 5. Create Agent ── */}
          <L n={23}>
            <I1><Cmt t="# 4. Create OpenAI Agent" /></I1>
          </L>
          <L n={24}>
            <I1><Va t="agent" /><Op t=" = " /><Ty t="Agent" /><Op t="(" /></I1>
          </L>
          <L n={25}>
            <I2><Va t="name" /><Op t="=" /><Str t='"EdgeOne Assistant"' /><Op t="," /></I2>
          </L>
          <L n={26}>
            <I2><Va t="instructions" /><Op t="=" /><Va t="INSTRUCTIONS" /><Op t="," /></I2>
          </L>
          <L n={27}>
            <I2><Va t="model" /><Op t="=" /><Va t="llm_model" /><Op t="," /></I2>
          </L>
          <L n={28}>
            <I2><Va t="tools" /><Op t="=" /><Va t="TOOLS" /><Op t="," /></I2>
          </L>
          <L n={29}>
            <I1><Op t=")" /></I1>
          </L>
          <L n={30} />

          {/* ── 6. Run Agent with session ── */}
          <L n={31}>
            <I1><Cmt t="# 5. Run Agent with Store session" /></I1>
          </L>
          <L n={32}>
            <I1><Va t="result" /><Op t=" = " /><Ty t="Runner" /><Op t="." /><Fn t="run_streamed" /><Op t="(" /></I1>
          </L>
          <L n={33}>
            <I2><Va t="agent" /><Op t="," /></I2>
          </L>
          <L n={34}>
            <I2><Va t="input" /><Op t="=" /><Va t="message" /><Op t="," /></I2>
          </L>
          <L n={35}>
            <I2><Va t="session" /><Op t="=" /><Va t="session" /><Op t="," /></I2>
          </L>
          <L n={36}>
            <I1><Op t=")" /></I1>
          </L>
          <L n={37} />

          {/* ── 7. Collect result & save ── */}
          <L n={38}>
            <I1><Cmt t="# SSE streaming omitted..." /></I1>
          </L>
          <L n={39}>
            <I1><Va t="assistant_text" /><Op t=" = " /><Kw t="await " /><Fn t="collect_text" /><Op t="(" /><Va t="result" /><Op t=")" /></I1>
          </L>
          <L n={40} />
          <L n={41}>
            <I1><Cmt t="# 6. Store: save assistant reply for /history" /></I1>
          </L>
          <L n={42}>
            <I1><Kw t="await " /><Va t="store" /><Op t="." /><Fn t="append_message" /><Op t="(" /><Va t="conversation_id" /><Op t=", " /><Str t='"assistant"' /><Op t=", " /><Va t="assistant_text" /><Op t=")" /></I1>
          </L>
          <L n={43} />
          <L n={44}>
            <I1><Kw t="return " /><Op t="{" /><Str t='"answer"' /><Op t=": " /><Va t="assistant_text" /><Op t="}" /></I1>
          </L>
        </div>
      </div>

      {/* ── Footer tag ── */}
      <div className={styles.footer}>
        <span className={styles.footerDot} />
        <span>OpenAI Agents SDK · EdgeOne Makers</span>
      </div>
    </div>
  );
}
