import styles from './StepIndicator.module.css';

const STEPS = [
  { label: 'Dados',      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { label: 'Recebimento',icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
  { label: 'Revisão',    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg> },
  { label: 'Pagamento',  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
];

const CHECK = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

export default function StepIndicator({ currentStep }) {
  const pct = ((currentStep - 1) / 3) * 100;

  return (
    <section className={styles.wrap}>
      <div className={styles.container}>
        <div className={styles.track}/>
        <div className={styles.fill} style={{ width: `${pct}%` }}/>

        {STEPS.map((step, i) => {
          const n = i + 1;
          const done   = n < currentStep;
          const active = n === currentStep;
          return (
            <div key={n} className={`${styles.step} ${active ? styles.active : ''} ${done ? styles.done : ''}`}>
              <div className={styles.circle}>
                {done ? CHECK : step.icon}
              </div>
              <div className={styles.label}>{step.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
