import styles from './GradientBG.module.css';

export default function GradientBG({ children }) {
  return (
    <>
      <div className={styles.background}>
        <div className={styles.backgroundGradients}>
          <div className={styles.gradientBlob} data-blob="1"></div>
          <div className={styles.gradientBlob} data-blob="2"></div>
          <div className={styles.gradientBlob} data-blob="3"></div>
          <div className={styles.gradientBlob} data-blob="4"></div>
          <div className={styles.gradientBlob} data-blob="5"></div>
        </div>
      </div>
      <div className={styles.container}>{children}</div>
    </>
  );
}
