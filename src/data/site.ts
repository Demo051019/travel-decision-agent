/**
 * 站点级信息。email / resume 留空时，联系区会自动隐藏对应入口，
 * 不会出现「待填」这类占位文案。
 */

export const site = {
  name: 'Demo',
  nameZh: '戴',
  role: '大数据技术 · AI Agent 应用开发',
  location: '深圳',
  cohort: '2027 届',
  github: 'https://github.com/Demo051019',
  email: '13534033028@163.com',
  resume: '', // 例：'/resume.pdf'（文件放 public/ 下）
};

/** 联系方式页展示的信息。 */
export const contact = {
  name: '戴嘉兴',
  availability: '可实习 6 个月以上，随时到岗',
  phone: '13534033028',
  wechat: '微信同号',
  email: '13534033028@163.com',
  location: '深圳市',
  school: '深圳职业技术大学',
};

/** 联系方式页的自我评价。 */
export const selfEvaluation = [
  {
    label: '项目能力',
    text: '具备编程基础、Web 前端开发实践与数据可视化功能实现、精通Excel等办公软件',
  },
  {
    label: '个人性格',
    text: '外向，表达能力强，善于沟通协作，能快速学习新技术并应用到项目中',
  },
  {
    label: '熟悉AI工具',
    text: '对数据敏感且对 AI 及其产品有浓厚兴趣，希望在实习中积累真实项目经验',
  },
  {
    label: '优秀协作能力',
    text: '具备良好的社交统筹协作能力和心理，能够在各种场合妥善沟通',
  },
];
