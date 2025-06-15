import { useEffect, useState } from 'react';

import TopBar from '@/components/topBar/TopBar';
import styles from './MemoryTestScreen.module.css';
import ContentButton from '@/components/contentButton/ContentButton';
import ProgressBar from '@/components/progressBar/ProgressBar';
import { runTest, continueAfterTestCompletion } from './interactions/test';
import { GpuAllocationStatus } from './memoryTest';
import { byteCountToGb } from '@/common/memoryUtil';
import { getFinalMessage, getMessage } from './interactions/conversation';

const MESSAGE_CHECK_INTERVAL_MS = 200;

// This flag needs to be outside the component to allow the useEffect()-called handler to see current state.
let cancelSignaled = false;

function MemoryTestScreen() {
  const [frameNo, setFrameNo] = useState<number>(0);
  const [gpuAllocationStatus, setGpuAllocationStatus] = useState<GpuAllocationStatus|null>(null);
  const [hasCanceled, setHasCanceled] = useState<boolean>(false);
  const [hasCompleted, setHasCompleted] = useState<boolean>(false);

  function _onNextStatus(status: GpuAllocationStatus):boolean {
    setGpuAllocationStatus(status);
    return !cancelSignaled;
  }

  useEffect(() => {
    cancelSignaled = false;
    runTest(_onNextStatus).then((finalStatus) => {
      if (finalStatus) continueAfterTestCompletion(finalStatus, cancelSignaled, setHasCompleted);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setFrameNo(frameNo + 1), MESSAGE_CHECK_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [frameNo]);

  const conversationMessage = gpuAllocationStatus 
    ? hasCompleted 
      ? getFinalMessage(gpuAllocationStatus)
      : getMessage(gpuAllocationStatus) 
    : '';

  const footer =
    <>
      <ContentButton text='Cancel' onClick={() => {setHasCanceled(true); cancelSignaled=true;}} disabled={hasCanceled} />
    </>;

  const explanationText = hasCanceled
    ? <p>Freeing memory and canceling the test...</p>
    : <p>{conversationMessage}</p>;
  const content = gpuAllocationStatus === null
    ? <p>Initializing memory test...</p>
    : <>
        <h1>Testing {byteCountToGb(gpuAllocationStatus.totalAllocatedSize)} of {byteCountToGb(gpuAllocationStatus.maxAttemptSize)} GB</h1>
        <div className={styles.progressBar}>
          <ProgressBar percentComplete={gpuAllocationStatus.totalAllocatedSize / gpuAllocationStatus.maxAttemptSize} />
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