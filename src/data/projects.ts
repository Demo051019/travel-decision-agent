/**
 * 作品数据。新增项目只需要在这里加一条，首页会自动渲染。
 *
 * 图片放在 public/projects/<slug>/ 下，cover 写 "/projects/<slug>/cover.webp"。
 * status 为 'draft' 的项目不会出现在首页，方便先占位、后补内容。
 */

export type ProjectStatus = 'live' | 'draft';

export interface ProjectLink {
  label: string;
  href: string;
  primary?: boolean;
  /** 站内但非 SPA 路由（例如 public/ 下的独立 HTML），用 <a> 同窗口跳转 */
  external?: boolean;
}

export interface ProjectMetric {
  value: string;
  label: string;
}

export interface Project {
  slug: string;
  index: string;
  title: string;
  kicker: string;
  subtitle: string;
  summary: string;
  role: string;
  year: string;
  stack: string[];
  metrics: ProjectMetric[];
  cover?: string;
  accent: string;
  links: ProjectLink[];
  status: ProjectStatus;
}

export const projects: Project[] = [
  {
    slug: 'travel-agent',
    index: '01',
    title: '出行决策 Agent',
    kicker: 'AGENT · CASE STUDY',
    subtitle: '一句话问出「去哪、怎么去、现在堵不堵」。',
    summary:
      '把定位解析、商场检索、品牌核对、路线与实时路况串成一条可观测的工具链。回答不是泛泛的建议，而是带步行、公交、打车三种方案和当前路况的具体去处。',
    role: 'Agent · 地图开发',
    year: '2026',
    stack: ['React', 'TypeScript', 'Python', 'OpenAI Agents SDK', '高德 API', 'SSE'],
    metrics: [
      { value: '4', label: '工具协同' },
      { value: '5 步', label: '可观测链路' },
      { value: '实时', label: '路况判断' },
    ],
    accent: '#f5c842',
    links: [
      { label: '在线试用', href: '/agent', primary: true },
      { label: '源码', href: 'https://github.com/Demo051019/travel-decision-agent' },
    ],
    status: 'live',
  },
  {
    slug: 'frame-rate-lab',
    index: '02',
    title: '帧率实验室',
    kicker: 'WEB · RENDERING',
    subtitle: '24Hz 到 240Hz，同一条轨道上的采样差异。',
    summary:
      '八条轨道共用一套运动学公式，但每档按自己的目标帧率独立节流写 DOM —— 所以 24Hz 的跳跃是真实采样造成的，不是把动画调慢。附带屏幕刷新率探测和 iOS 渲染上限提示。',
    role: '前端 · 可视化',
    year: '2026',
    stack: ['HTML', 'CSS', 'Vanilla JS', 'requestAnimationFrame'],
    metrics: [
      { value: '8 档', label: '采样率对比' },
      { value: '240Hz', label: '最高档位' },
      { value: '双主题', label: '深色 / 浅色' },
    ],
    accent: '#22d3ee',
    links: [{ label: '打开实验', href: '/fps.html', primary: true, external: true }],
    status: 'live',
  },
  {
    slug: 'course-project-a',
    index: '03',
    title: '课程项目 A',
    kicker: 'DATA · DRAFT',
    subtitle: '待替换：一句话说清它解决什么问题。',
    summary:
      '把 projects.ts 里这条的标题、指标和链接换成你的真实项目，status 改成 live 就会出现在首页。',
    role: '待填',
    year: '2026',
    stack: ['Python', 'SQL', 'Pandas'],
    metrics: [
      { value: '—', label: '待填' },
      { value: '—', label: '待填' },
      { value: '—', label: '待填' },
    ],
    accent: '#7f9cf5',
    links: [],
    status: 'draft',
  },
  {
    slug: 'course-project-b',
    index: '04',
    title: '课程项目 B',
    kicker: 'DATA · DRAFT',
    subtitle: '待替换：一句话说清它解决什么问题。',
    summary:
      '同样是一个占位条目。两个课程项目补齐后，首页会从一条作品变成三条。',
    role: '待填',
    year: '2026',
    stack: ['Python', '可视化'],
    metrics: [
      { value: '—', label: '待填' },
      { value: '—', label: '待填' },
      { value: '—', label: '待填' },
    ],
    accent: '#5dcaa5',
    links: [],
    status: 'draft',
  },
];

export const liveProjects = projects.filter((p) => p.status === 'live');
export const hasDrafts = projects.some((p) => p.status === 'draft');
