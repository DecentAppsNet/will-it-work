import HomeScreen from "@/homeScreen/HomeScreen";
import { findMaxSafelyTestableAllocation } from "@/memoryTestScreen/memoryTestUtil";
import { setScreen } from "@/router/Router";
import { wait } from "@/common/waitUtil";
import DeviceCapabilities from "@/persistence/types/DeviceCapabilities";
import { putDeviceCapabilities } from "@/persistence/deviceCapabilities";
import { cancelMemoryTest, startMemoryTest } from "@/worker/api";
import MemoryTestStatusCallback from "@/worker/types/MemoryTestStatusCallback";
import MemoryTestStatus from "@/worker/types/MemoryTestStatus";
import MemoryTestStatusCode, { isResolvedStatusCode } from "@/worker/types/MemoryTestStatusCode";

let isRunning = false;

export async function runTest(onMemoryTestStatus:MemoryTestStatusCallback):Promise<void> {
  if (isRunning) return;
  isRunning = true;
  const maxAttemptSize = await findMaxSafelyTestableAllocation();
  startMemoryTest(maxAttemptSize, status => {
    if (isResolvedStatusCode(status.code)) isRunning = false;
    return onMemoryTestStatus(status);
  });
}

export function cancelTest(setCancelPending:(canceled:boolean) => void):void {
  if (!isRunning) return;
  cancelMemoryTest();
  setCancelPending(true);
} 

export async function continueAfterTestCompletion(status:MemoryTestStatus, setHasCompleted:(completed:boolean) => void):Promise<void> {
  const cancelSignaled = status.code === MemoryTestStatusCode.USER_CANCELED;
  if (cancelSignaled) { setScreen(HomeScreen.name); return; }

  const deviceCapabilities:DeviceCapabilities = {
    memoryCopyRate: status.averageCopyRate,
    maxGpuAllocationSize: status.totalAllocatedSize,
    lastTestStatusCode: status.code,
    lastTestTimestamp: Date.now()
  }
  await putDeviceCapabilities(deviceCapabilities);

  await wait(2000); // Wait a bit to let the user see the penultimate message.
  setHasCompleted(true);
  await wait(3000); // Wait a bit more to let the user see the final message.
  
  setScreen(HomeScreen.name);
}