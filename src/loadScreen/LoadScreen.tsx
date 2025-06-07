import {useState, useEffect} from "react";

import styles from './LoadScreen.module.css';
import { init } from "./interactions/initialization";
import ProgressBar from '@/components/progressBar/ProgressBar';
import TestStartDialog from './dialogs/TestStartDialog';
import TopBar from '@/components/topBar/TopBar';

type Props = {
  onComplete: () => void;
}

function LoadScreen(props:Props) {
  const [percentComplete, setPercentComplete] = useState(0);
  const [needLlmLoadConfirmation, setNeedLlmLoadConfirmation] = useState(true);
  const [modalDialogName, setModalDialogName] = useState<string|null>(null);
  const [currentTask, setCurrentTask] = useState('Loading');
  const {onComplete} = props;
  
  useEffect(() => {
    if (needLlmLoadConfirmation) { setModalDialogName(TestStartDialog.name); return; }
    init(setPercentComplete, setCurrentTask).then((isInitialized) => { if (isInitialized) onComplete(); });
  }, [needLlmLoadConfirmation, setPercentComplete, setCurrentTask]);
  
  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <div className={styles.progressBarContainer}>
          <ProgressBar percentComplete={percentComplete}/>
          {currentTask}
        </div>
      </div>

      <TestStartDialog
        isOpen={modalDialogName === TestStartDialog.name} 
        onConfirm={() => { setModalDialogName(null); setNeedLlmLoadConfirmation(false) }} 
      />
    </div>
  );
}

export default LoadScreen;