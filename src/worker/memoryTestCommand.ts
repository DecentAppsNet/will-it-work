import { GIGABYTE, randomishMemoryValue } from "@/common/memoryUtil";
import { estimateAvailableStorage } from "@/common/storageUtil";
import MemoryTestStatus from "./types/MemoryTestStatus";
import MemoryTestStatusCode from "./types/MemoryTestStatusCode";
import MemoryTestStatusCallback from "./types/MemoryTestStatusCallback";
import MemoryTestCancelCallback from "./types/MemoryTestCancelCallback";

// To avoid `self` compilation issues with Vite, don't add exports not intended to run in the web 
// worker thread. Put those in memoryTestUtil.ts instead.

const OS_VIRTUAL_MEMORY_BUFFER = 5 * GIGABYTE;

function _allocBuffer(device:GPUDevice, size:number, label:string, usage:GPUBufferUsageFlags, 
    mappedAtCreation:boolean, status:MemoryTestStatus):GPUBuffer|null {
  try {
    return device.createBuffer({size, label, usage, mappedAtCreation});
  } catch (e) {
    status.code = MemoryTestStatusCode.ALLOCATION_FAILED;
    status.errorInfo = `Failed to allocate buffer of size ${size}: ${e}`;
    return null;
  }
}

function _allocReadBackBuffer(device:GPUDevice, size:number, status:MemoryTestStatus):GPUBuffer|null {
  const usage = GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ;
  return _allocBuffer(device, size, 'readback', usage, false, status);
}

function _allocTestBuffer(device:GPUDevice, size:number, bufferNo:number, status:MemoryTestStatus):GPUBuffer|null {
  const usage = GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC;
  return _allocBuffer(device, size, `test #${bufferNo}`, usage, true, status);
}

function _isBufferMapped(buffer:GPUBuffer):boolean {
  return buffer.mapState === 'mapped';
}

function _updateCopyRateMetrics(newCopyRate:number, copyRates:number[], status:MemoryTestStatus):void {
  newCopyRate = Math.round(newCopyRate);
  copyRates.push(newCopyRate);
  if (copyRates.length === 1) {
    status.slowestCopyRate = status.fastestCopyRate = newCopyRate;
  } else {
    if (newCopyRate < status.slowestCopyRate) status.slowestCopyRate = newCopyRate;
    if (newCopyRate > status.fastestCopyRate) status.fastestCopyRate = newCopyRate;
  }
  status.averageCopyRate = copyRates.reduce((sum, rate) => sum + rate, 0) / copyRates.length;
  status.averageCopyRate = Math.round(status.averageCopyRate * 100) / 100; // round to 2 decimal places
}

export async function testMemory(maxAttemptSize:number, onMemoryTestStatus:MemoryTestStatusCallback, 
    onMemoryTestCancel:MemoryTestCancelCallback):Promise<MemoryTestStatus> {
  
  const REASONABLE_RAM_COPY_TIME_MS = 5000;
  const status:MemoryTestStatus = {
    totalAllocatedSize:0,
    availableStorage:await estimateAvailableStorage() || 0,
    code:MemoryTestStatusCode.TEST_IN_PROGRESS,
    maxAttemptSize,
    slowestCopyRate:-1,
    averageCopyRate:-1,
    fastestCopyRate:-1
  }

  let copyRates:number[] = [];
  let allBuffers:GPUBuffer[] = [];
  try {
    const gpu:GPU|undefined  = self.navigator.gpu;
    if (!gpu)  { 
      status.code = MemoryTestStatusCode.GPU_NOT_SUPPORTED;
      onMemoryTestStatus(status);
      return status;
    }

    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      status.code = MemoryTestStatusCode.ADAPTER_NOT_AVAILABLE;
      onMemoryTestStatus(status);
      return status;
    }
    const maxBufferAllocation = adapter.limits.maxBufferSize;
    const allocChunkSize = Math.min(maxBufferAllocation, GIGABYTE / 8); // Balancing efficiency with useful granularity of measured result.    
    const device = await adapter.requestDevice({ requiredLimits: { maxBufferSize:allocChunkSize } });
    if (!device) {
      status.code = MemoryTestStatusCode.DEVICE_NOT_AVAILABLE;
      onMemoryTestStatus(status);
      return status;
    }

    const readBackBuffer = _allocReadBackBuffer(device, allocChunkSize, status);
    if (!readBackBuffer) { onMemoryTestStatus(status); return status; }
    allBuffers.push(readBackBuffer);
    status.totalAllocatedSize += allocChunkSize;

    onMemoryTestStatus(status);
    
    if (onMemoryTestCancel()) {
      status.code = MemoryTestStatusCode.USER_CANCELED;
      onMemoryTestStatus(status);
      return status;
    }
    
    let bufferNo = 0;
    while(status.totalAllocatedSize < maxAttemptSize) {
      // Check if we're getting low on disk storage, perhaps as a consequence of allocating via unified memory architecture into virtual memory.
      status.availableStorage = await estimateAvailableStorage();
      if (status.availableStorage < OS_VIRTUAL_MEMORY_BUFFER) {
        status.code = MemoryTestStatusCode.LOW_STORAGE_AVAILABILITY;
        status.errorInfo = `Available storage is low, stopping at ${status.totalAllocatedSize} bytes.`;
        break;
      }

      // Allocate the buffer.
      const testBuffer = _allocTestBuffer(device, allocChunkSize, ++bufferNo, status);
      if (!testBuffer) { 
        status.code = MemoryTestStatusCode.ALLOCATION_FAILED;
        status.errorInfo = `Failed to allocate buffer #${bufferNo} of size ${allocChunkSize}.`;
        break;
      }
      allBuffers.push(testBuffer);
      
      // Write across entire buffer to detect virtual memory page faults.
      const writeArray = new Uint8Array(testBuffer.getMappedRange());
      for(let writeI = 0; writeI < allocChunkSize; writeI ++) { writeArray[writeI] = randomishMemoryValue(writeI); }
      testBuffer.unmap();

      // Copy test buffer to readback buffer for verification.
      const commandEncoder = device.createCommandEncoder();
      commandEncoder.copyBufferToBuffer(testBuffer, 0, readBackBuffer, 0, allocChunkSize);
      device.pushErrorScope('out-of-memory');
      device.pushErrorScope('internal');
      device.pushErrorScope('validation');
      const beforeCopyTime = performance.now();
      device.queue.submit([commandEncoder.finish()]);
      try {
        await device.queue.onSubmittedWorkDone();
      } catch(e) { 
        // I'm irritated that the GPU driver can also just throw due to an internal error, and it won't be wrapped by the API's error handling.
        status.code = MemoryTestStatusCode.GPU_DRIVER_FAILURE;
        status.errorInfo = `GPU driver failure during copy: ${e instanceof Error ? e.message : String(e)}`;
        break;
      }
      const copyTime = performance.now() - beforeCopyTime;
      const validationError = await device.popErrorScope();
      const internalError = await device.popErrorScope();
      const oomError = await device.popErrorScope();
      if (validationError || internalError || oomError) {
        if (validationError) {
          status.code = MemoryTestStatusCode.VALIDATION_ERROR;
          status.errorInfo = validationError.message;
        }
        if (internalError) {
          status.code = MemoryTestStatusCode.INTERNAL_ERROR;
          status.errorInfo = internalError.message;
        }
        if (oomError) {
          status.code = MemoryTestStatusCode.OOM_ERROR;
          status.errorInfo = oomError.message;
        }
        break;
      }
      _updateCopyRateMetrics(Math.round(allocChunkSize / copyTime), copyRates, status);

      // If copy takes too long, I'm likely using virtual memory with an integrated GPU. Not necessarily a problem, 
      // but it it's too slow, we should stop and use the total for memory that was accessed faster.
      if (copyTime > REASONABLE_RAM_COPY_TIME_MS) {
        status.code = MemoryTestStatusCode.COPY_TOO_SLOW;
        status.errorInfo = `Copy took too long (${copyTime} ms for ${allocChunkSize} bytes).`;
        break; 
      }

      // Check that the buffer was written correctly.
      const spotCheckInterval = Math.floor(allocChunkSize / 16); // Don't need to read the whole buffer, just a few spots.
      await readBackBuffer.mapAsync(GPUMapMode.READ, 0, allocChunkSize);
      const readArray = new Uint8Array(readBackBuffer.getMappedRange(0, allocChunkSize));
      let readI = 0;
      for (; readI < allocChunkSize; readI += spotCheckInterval) { if (readArray[readI] !== randomishMemoryValue(readI)) break; }
      if (readI < allocChunkSize) {
        status.code = MemoryTestStatusCode.COPY_FAILED;
        status.errorInfo = `Readback verification failed for buffer #${bufferNo}.`;
        break;
      }
      readBackBuffer.unmap();

      // This chunk is good, so we can count it as allocated.
      status.totalAllocatedSize += allocChunkSize;
      onMemoryTestStatus(status);

      if (onMemoryTestCancel()) {
        status.code = MemoryTestStatusCode.USER_CANCELED;
        break;
      }
    }

    if (status.code === MemoryTestStatusCode.TEST_IN_PROGRESS) status.code = MemoryTestStatusCode.MAX_ATTEMPT_SIZE_REACHED;
    onMemoryTestStatus(status);
  } catch (e) {
    status.code = MemoryTestStatusCode.UNEXPECTED_ERROR;
    status.errorInfo = e instanceof Error ? e.message : String(e);
    console.error(`Unexpected error during GPU allocation test: ${status.errorInfo}`);
    status.totalAllocatedSize -= GIGABYTE; // This seems like an uncontrolled kind of error, so let's back off a bit.
    if (status.totalAllocatedSize < 0) status.totalAllocatedSize = 0;
    onMemoryTestStatus(status);
  } finally {
    while(allBuffers.length > 0) {
      const buffer = allBuffers.pop();
      if (!buffer) continue;
      if (_isBufferMapped(buffer)) buffer.unmap();
      buffer.destroy();
    }
  }
  return status;
}