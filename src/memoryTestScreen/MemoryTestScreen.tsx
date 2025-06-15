import { useEffect, useState } from 'react';

import TopBar from '@/components/topBar/TopBar';
import styles from './MemoryTestScreen.module.css';
import ContentButton from '@/components/contentButton/ContentButton';
import { setScreen } from '@/router/Router';
import HomeScreen from '@/homeScreen/HomeScreen';
import ProgressBar from '@/components/progressBar/ProgressBar';
import { init } from './interactions/initialization';
import { GpuAllocationStatus, GpuAllocationStatusCode } from './memoryTest';
import { byteCountToGb } from '@/common/memoryUtil';
import { continueToTestResults } from './interactions/continue';
import { nextMessage } from './interactions/conversation';

const MESSAGE_CHECK_INTERVAL_MS = 200;

// This flag needs to be outside the component to allow the useEffect()-called handler to see current state.
let cancelSignaled = false;

function MemoryTestScreen() {
  const [frameNo, setFrameNo] = useState<number>(0);
  const [gpuAllocationStatus, setGpuAllocationStatus] = useState<GpuAllocationStatus|null>(null);
  const [hasCanceled, setHasCanceled] = useState<boolean>(false);

  function _onNextStatus(status: GpuAllocationStatus):boolean {
    setGpuAllocationStatus(status);
    if (status.code === GpuAllocationStatusCode.USER_CANCELED) setScreen(HomeScreen.name);
    return !cancelSignaled;
  }

  useEffect(() => {
    cancelSignaled = false;
    init(_onNextStatus).then((finalStatus) => {
      continueToTestResults(finalStatus);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setFrameNo(frameNo + 1), MESSAGE_CHECK_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [frameNo]);

  const conversationMessage = gpuAllocationStatus ? nextMessage(gpuAllocationStatus) : '';

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