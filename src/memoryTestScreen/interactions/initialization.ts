import { findMaxGpuAllocation, findMaxSafelyTestableAllocation, GpuAllocationStatusCallback } from "../memoryTest"

export async function init(onGpuAllocationStatus:GpuAllocationStatusCallback) {
  const maxAttemptSize = await findMaxSafelyTestableAllocation();
  const finalStatus = await findMaxGpuAllocation(maxAttemptSize, onGpuAllocationStatus);
  console.log(`Max GPU allocation: ${finalStatus.totalAllocatedSize} bytes`);
  return finalStatus;
}