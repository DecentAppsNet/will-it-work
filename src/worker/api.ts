// This is the API for web worker commands. All code here runs on the main thread.
import MemoryTestStatusCallback from "@/worker/types/MemoryTestStatusCallback";

let theWorker:Worker|null = null;
let theMemoryTestStatusHandler:MemoryTestStatusCallback|null = null;

export function init() {
  if (theWorker) throw Error('Unexpected'); // Call init() only once.
  theWorker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

  theWorker.onmessage = (event:MessageEvent) => {
    const { type } = event.data;
    switch (type) {
      case 'memoryTestStatus':
        if (!theMemoryTestStatusHandler) throw Error('Unexpected');
        const { status } = event.data;
        if (!status) throw Error('Unexpected');
        theMemoryTestStatusHandler(status);
      break;
    
      default:
        throw Error(`Unexpected message from worker: ${JSON.stringify(event.data)}`);
    }
  }
}

export function startMemoryTest(maxAttemptSize:number, onMemoryTestStatus:MemoryTestStatusCallback) {
  if (!theWorker) throw Error('Unexpected'); // Call init() first.
  theMemoryTestStatusHandler = onMemoryTestStatus;
  theWorker.postMessage({ command:'startMemoryTest', maxAttemptSize });
}

export function cancelMemoryTest() {
  if (!theWorker) throw Error('Unexpected'); // Call init() first.
  theWorker.postMessage({ command:'cancelMemoryTest' });
}