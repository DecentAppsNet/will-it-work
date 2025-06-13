import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import TopBar from '@/components/topBar/TopBar';
import { init } from "./interactions/initialization";
import CategoryCheck from "./CategoryCheck";
import ContentButton from "@/components/contentButton/ContentButton";
import { setScreen } from "@/router/Router";
import MemoryTestScreen from "@/memoryTestScreen/MemoryTestScreen";

let firstVisitComplete = false;

function HomeScreen() {
  const [visibleCategories, setVisibleCategories] = useState<number>(0);
  
  useEffect(() => {
    init().then(() => {
      if (firstVisitComplete) { setVisibleCategories(3); return; }
      setTimeout(() => setVisibleCategories(1), 1000);
      setTimeout(() => setVisibleCategories(2), 2000);
      setTimeout(() => { 
        setVisibleCategories(3);
        firstVisitComplete = true;
      }, 3000);
    });
  }, []);

  const footerContent = visibleCategories >= 3 ? (
    <>
      <ContentButton text='Back to App' onClick={() => {}} />
      <ContentButton text='Run Memory Test' onClick={() => {setScreen(MemoryTestScreen.name)}} />
    </>
  ) : null;

  return (
    <div className={styles.container}>
      <TopBar/>

      <div className={styles.content}>
        <h1>How well will your device work with local LLMs?</h1>

        <CategoryCheck summary="Your browser has access to the right features." status="success" subItems={[
          "WebGPU is supported",
          "WebGL is supported",
          "Storage API is supported"
        ]} visible={visibleCategories >= 1}/>

        <CategoryCheck summary="You have enough disk space to store any available model." status="success" subItems={[
          "852 GB of free disk space available",
          "Any model available via WebLLM can be downloaded"
        ]} visible={visibleCategories >= 2}/>

        <CategoryCheck summary="Not sure how much video memory you have." status="unknown" subItems={[
          "You can run a one-time memory test to determine available memory for this session and others."
        ]} visible={visibleCategories >= 3}/>
      </div>
      
      <div className={styles.footer}>
        { footerContent }
      </div>
    </div>
  );
}

export default HomeScreen;