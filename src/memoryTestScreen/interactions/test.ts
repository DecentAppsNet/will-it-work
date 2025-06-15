import HomeScreen from "@/homeScreen/HomeScreen";
import { findMaxGpuAllocation, findMaxSafelyTestableAllocation, GpuAllocationStatus, GpuAllocationStatusCallback } from "../memoryTest"
import { setScreen } from "@/router/Router";
import { wait } from "@/common/waitUtil";

let isRunning = false;

export async function runTest(onGpuAllocationStatus:GpuAllocationStatusCallback):Promise<GpuAllocationStatus|null> {
  if (isRunning) return null;
  isRunning = true;
  try {
    const maxAttemptSize = await findMaxSafelyTestableAllocation();
    const finalStatus = await findMaxGpuAllocation(maxAttemptSize, onGpuAllocationStatus);
    return finalStatus;
  } finally {
    isRunning = false;
  }
}

export async function continueAfterTestCompletion(_status:GpuAllocationStatus, cancelSignaled:boolean, setHasCompleted:(completed:boolean) => void):Promise<void> {
  console.log(`Continuing after test completion. Cancel signaled: ${cancelSignaled}`);
  if (cancelSignaled) { setScreen(HomeScreen.name); return; }

  await wait(2000); // Wait a bit to let the user see the penultimate message.
  setHasCompleted(true);
  await wait(3000); // Wait a bit more to let the user see the final message.
  
  setScreen(HomeScreen.name);
  //setScreen(MemoryTestResultsScreen.name, { status }); TODO
}