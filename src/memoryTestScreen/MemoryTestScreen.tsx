import TopBar from '@/components/topBar/TopBar';
import styles from './MemoryTestScreen.module.css';
import ContentButton from '@/components/contentButton/ContentButton';
import { setScreen } from '@/router/Router';
import HomeScreen from '@/homeScreen/HomeScreen';
import ProgressBar from '@/components/progressBar/ProgressBar';

function MemoryTestScreen() {

  const footerContent = (
    <>
      <ContentButton text='Cancel' onClick={() => {setScreen(HomeScreen.name)}} />
    </>
  );

  return (
    <div className={styles.container}>
      <TopBar />

      <div className={styles.content}>
        <h1>Testing 42 of 256 GB</h1>
        <div className={styles.progressBar}>
          <ProgressBar percentComplete={.50} />
        </div>
        <p>We are allocating as much video memory as we can. When it fails, that means we found the limit.</p>
        <p>It takes some time, because after each allocation, we have to prove the allocated memory works by reading and writing to it.</p>
      </div>

      <div className={styles.footer}>
        { footerContent }
      </div>
    </div>
  );
}

export default MemoryTestScreen;