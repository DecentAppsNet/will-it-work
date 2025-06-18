// Entrypoint for code that runs in web worker thread. Called functions are Web Worker-compatible, but do not 
// directly call `postMessage()`. This is so I can run the same code in both web worker and main thread environments,
import { testMemory } from '@/worker/memoryTestCommand';
import MemoryTestStatus from './types/MemoryTestStatus';

let isMemoryTestRunning = false;
let shouldCancelMemoryTest = false;

function _onMemoryTestCallback(status:MemoryTestStatus) {
  self.postMessage({ type:'memoryTestStatus', status });
}

function _isCancelSignalled():boolean {
  return shouldCancelMemoryTest;
}

self.onmessage = async (event: MessageEvent) => {
  const { command } = event.data;

  switch (command) {
    case 'startMemoryTest':
      if (isMemoryTestRunning) throw Error('Unexpected'); // Cannot start a new test while another is running.
      const { maxAttemptSize } = event.data;
      if (!maxAttemptSize) throw Error('Unexpected'); // Must provide maxAttemptSize.

      isMemoryTestRunning = true;
      try {
        shouldCancelMemoryTest = false;
        await testMemory(maxAttemptSize, _onMemoryTestCallback, _isCancelSignalled);
      } finally {
        isMemoryTestRunning = false;
      }
    break;
    
    case 'cancelMemoryTest':
      shouldCancelMemoryTest = true;
    break;

    default:
      throw Error('Unexpected command: ' + command);
  }
};


/* You've got redundant cancel logic.
  #1
  Remove shouldCancel and cancelMemoryTest from here and api.ts.  
  The onMemoryTestStatus handler just needs to return false to cancel.
  
  #2
  Remove return value from memoryTestStatusCallback, pass a separate isCancelSignalled callback to testMemory.
  MemoryTestScreen calls "cancelMemoryTest()".
*/