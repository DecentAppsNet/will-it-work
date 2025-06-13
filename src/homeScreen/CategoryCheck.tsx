import styles from './CategoryCheck.module.css';
import CategoryCheckInfo from './types/CategoryCheckInfo';

type Props = CategoryCheckInfo & { }

function CategoryCheck({ summary, subItems, status, visible }:Props) {
  if (!visible) {
    return (
      <div className={styles.container}>
      <div className={`${styles.statusIcon} ${styles.hidden}`}></div>
    </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.statusIcon} ${styles[status]}`}></div>
      <div className={styles.description}>
        <div className={styles.summary}>{summary}</div>
        <ul className={styles.subItems}>
          {subItems.map((item, index) => (
            <li key={index} className={styles.subItem}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default CategoryCheck;