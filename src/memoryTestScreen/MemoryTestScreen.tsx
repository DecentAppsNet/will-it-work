import { useEffect, useState } from 'react';

import TopBar from '@/components/topBar/TopBar';
import styles from './MemoryTestScreen.module.css';
import ContentButton from '@/components/contentButton/ContentButton';
import ProgressBar from '@/components/progressBar/ProgressBar';
import { runTest, continueAfterTestCompletion, cancelTest } from './interactions/test';
import { byteCountToGb } from '@/common/memoryUtil';
import { getFinalMessage, getMessage } from './interactions/conversation';
import MemoryTestStatus from '@/worker/types/MemoryTestStatus';
import { isResolvedStatusCode } from '@/worker/types/MemoryTestStatusCode';

const MESSAGE_CHECK_INTERVAL_MS = 200;

function MemoryTestScreen() {
  const [frameNo, setFrameNo] = useState<number>(0);
  const [memoryTestStatus, setMemoryTestStatus] = useState<MemoryTestStatus|null>(null);
  const [isCancelPending, setCancelPending] = useState<boolean>(false);
  const [hasCompleted, _setHasCompleted] = useState<boolean>(false);

  function _onNextStatus(status:MemoryTestStatus) {
    setMemoryTestStatus(status);
    if (isResolvedStatusCode(status.code)) continueAfterTestCompletion(status, _setHasCompleted);
  }

  useEffect(() => {
    runTest(_onNextStatus);
  }, []);

  useEffect(() => { // The updated frame# is an easy way to get a periodic update on the status messages. It's fine until you have anything CPU-intensive in the render.
    const timer = setTimeout(() => setFrameNo(frameNo + 1), MESSAGE_CHECK_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [frameNo]);

  const conversationMessage = memoryTestStatus 
    ? hasCompleted 
      ? getFinalMessage()
      : getMessage(memoryTestStatus) 
    : '';

  const footer =
    <>
      <ContentButton text='Cancel' onClick={() => {cancelTest(setCancelPending);}} disabled={isCancelPending} />
    </>;

  const explanationText = isCancelPending
    ? <p className={styles.statusText}>Freeing memory and canceling the test...</p>
    : <p className={styles.statusText}>{conversationMessage}</p>;
  const content = memoryTestStatus === null
    ? <p>Initializing memory test...</p>
    : <>
        <h1>Testing {byteCountToGb(memoryTestStatus.totalAllocatedSize)} of {byteCountToGb(memoryTestStatus.maxAttemptSize)} GB</h1>
        <div className={styles.progressBar}>
          <ProgressBar percentComplete={memoryTestStatus.totalAllocatedSize / memoryTestStatus.maxAttemptSize} />
        </div>
        {explanationText}
      </>;

  return (
    <div className={styles.container}>
      <TopBar />

      <div className={styles.content}>
        {content}
      </div>

      <div className={styles.footer}>
        {footer}
      </div>
    </div>
  );
}

export default MemoryTestScreen;