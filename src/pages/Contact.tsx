import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { contact } from '../data/site';
import ThemeToggle from '../components/ThemeToggle';
import styles from './Contact.module.css';

const fields = [
  { label: '姓名', value: contact.name },
  { label: '时间', value: contact.availability },
  {
    label: '电话',
    value: contact.phone,
    note: contact.wechat,
    href: `tel:${contact.phone}`,
  },
  { label: '邮箱', value: contact.email, href: `mailto:${contact.email}` },
  { label: '意向工作地', value: contact.location },
  { label: '毕业院校', value: contact.school },
];

export default function Contact() {
  // Keep the phone number out of search results.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <Link to="/" className={styles.back}>
            ← 返回作品集
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className={styles.main}>
        <p className={styles.eyebrow}>CONTACT / 联系方式</p>
        <h1 className={styles.title}>个人简历</h1>

        <div className={styles.card}>
          {fields.map((field) => (
            <div key={field.label} className={styles.field}>
              <span className={styles.label}>{field.label}</span>
              <div className={styles.row}>
                {field.href ? (
                  <a href={field.href} className={styles.valueLink}>
                    {field.value}
                  </a>
                ) : (
                  <span className={styles.value}>{field.value}</span>
                )}
                {field.note && <span className={styles.note}>{field.note}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <a href={`mailto:${contact.email}`} className={styles.primary}>
            发邮件 →
          </a>
          <a href={`tel:${contact.phone}`} className={styles.ghost}>
            打电话
          </a>
        </div>
      </main>
    </div>
  );
}
