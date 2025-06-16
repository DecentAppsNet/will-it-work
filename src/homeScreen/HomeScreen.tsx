import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import TopBar from '@/components/topBar/TopBar';
import { init } from "./interactions/initialization";
import CategoryCheck from "./CategoryCheck";
import ContentButton from "@/components/contentButton/ContentButton";
import { setScreen } from "@/router/Router";
import MemoryTestScreen from "@/memoryTestScreen/MemoryTestScreen";
import CategoryCheckInfo from "./types/CategoryCheckInfo";
import { createAppUrl } from "@/common/urlUtil";

let firstVisitComplete = false;

function HomeScreen() {
  const [categories, setCategories] = useState<CategoryCheckInfo[]>([]);
  const [isMemoryTestDisabled, setIsMemoryTestDisabled] = useState<boolean>(false);
  const [fromAppName, setFromAppName] = useState<string|null>(null);
  
  useEffect(() => {
    init().then((initResults) => {
      if (!initResults) return;
      const { categoryChecks, fromAppName:nextFromAppName } = initResults;
      setIsMemoryTestDisabled(initResults.disableMemoryTest);
      setFromAppName(nextFromAppName);
      if (firstVisitComplete) { categoryChecks.forEach(c => c.visible = true); setCategories(categoryChecks); return; }
      setCategories(categoryChecks);
      for (let i = 0; i < categoryChecks.length; i++) {
        setTimeout(() => {
          categoryChecks[i].visible = true;
          setCategories([...categoryChecks]);
          if (i === categoryChecks.length - 1) firstVisitComplete = true;
        }, (i + 1) * 600);
      }
    });
  }, []);

  if (categories.length === 0) return null; // Better to not render anything until I have the category data, which affects layout.

  const runMemoryTestText = categories[2].status === 'success'
    ? 'Run Memory Test Again'
    : 'Run Memory Test';
  const backToAppButton = !fromAppName ? null :
    <ContentButton text={`Return to App`} onClick={() => {window.location.href = createAppUrl(fromAppName) }} />;
  const footerContent = categories.every(c => c.visible) ? (
    <>
      {backToAppButton}
      <ContentButton text={runMemoryTestText} onClick={() => {setScreen(MemoryTestScreen.name)}} disabled={isMemoryTestDisabled} />
    </>
  ) : null;

  const categoriesContent = categories.map((category, index) => (
    <CategoryCheck
      key={index}
      summary={category.summary}
      status={category.status}
      subItems={category.subItems}
      visible={category.visible}
    />
  ));

  return (
    <div className={styles.container}>
      <TopBar/>

      <div className={styles.content}>
        <h1>How well will your device work with local LLMs?</h1>
        {categoriesContent}
      </div>
      
      <div className={styles.footer}>
        {footerContent}
      </div>
    </div>
  );
}

export default HomeScreen;