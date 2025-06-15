import { estimateSystemMemory, GIGABYTE } from "@/common/memoryUtil";
import { estimateAvailableStorage } from "@/common/storageUtil";

const CRAZY_HARDWARE_ALLOC_SIZE = 256 * GIGABYTE; // 256 GB - it would be very special hardware that could allocate this much.
const OS_VIRTUAL_MEMORY_BUFFER = 5 * GIGABYTE;

function _allocBuffer(device:GPUDevice, size:number, label:string, usage:GPUBufferUsageFlags, mappedAtCreation:boolean, status:GpuAllocationStatus):GPUBuffer|null {
  try {
    return device.createBuffer({size, label, usage, mappedAtCreation});
  } catch (e) {
    status.code = GpuAllocationStatusCode.ALLOCATION_FAILED;
    status.errorInfo = `Failed to allocate buffer of size ${size}: ${e}`;
    return null;
  }
}

function _allocReadBackBuffer(device:GPUDevice, size:number, status:GpuAllocationStatus):GPUBuffer|null {
  const usage = GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ;
  return _allocBuffer(device, size, 'readback', usage, false, status);
}

function _allocTestBuffer(device:GPUDevice, size:number, bufferNo:number, status:GpuAllocationStatus):GPUBuffer|null {
  const usage = GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC;
  return _allocBuffer(device, size, `test #${bufferNo}`, usage, true, status);
}

function _isBufferMapped(buffer:GPUBuffer):boolean {
  return buffer.mapState === 'mapped';
}
export enum GpuAllocationStatusCode {
  INITIALIZING = 'Initializing',
  TEST_IN_PROGRESS = 'Memory test in progress',
  MAX_ATTEMPT_SIZE_REACHED = 'Reached maximum attempt size',
  GPU_NOT_SUPPORTED = 'GPU not supported on this browser',
  ADAPTER_NOT_AVAILABLE = 'Adapter not available',
  DEVICE_NOT_AVAILABLE = 'Device not available',
  ALLOCATION_FAILED = 'Allocation failed',
  COPY_FAILED = 'Copy failed',
  COPY_TOO_SLOW = 'Copy too slow',
  VALIDATION_ERROR = 'Validation error',
  INTERNAL_ERROR = 'Internal error',
  OOM_ERROR = 'Out-of-memory error',
  LOW_STORAGE_AVAILABILITY = 'Low storage availability',
  USER_CANCELED = 'Allocation canceled by user',
  UNEXPECTED_ERROR = 'Unexpected error'
}

export type GpuAllocationStatus = {
  totalAllocatedSize:number;
  maxAttemptSize:number;
  slowestCopyRate:number;
  averageCopyRate:number;
  fastestCopyRate:number;
  availableStorage:number;
  code:GpuAllocationStatusCode;
  errorInfo?: string; // optional for additional error context
}

// The callback should return false to stop the allocation process, e.g. user clicked cancel. True to keep going.
export type GpuAllocationStatusCallback = (status:GpuAllocationStatus) => boolean;

function _setCopyRateMetrics(copyRates:number[], status:GpuAllocationStatus):void {
  if (copyRates.length === 0) return;
  status.slowestCopyRate = Math.max(...copyRates);
  status.fastestCopyRate = Math.min(...copyRates);
  status.averageCopyRate = copyRates.reduce((sum, rate) => sum + rate, 0) / copyRates.length;
  status.averageCopyRate = Math.round(status.averageCopyRate * 100) / 100; // round to 2 decimal places
  console.log(`Copy rates: ${copyRates.length} samples, slowest: ${status.slowestCopyRate}, fastest: ${status.fastestCopyRate}, average: ${status.averageCopyRate}`);
}

export async function findMaxGpuAllocation(maxAttemptSize:number, onGpuAllocationStatus:GpuAllocationStatusCallback):Promise<GpuAllocationStatus> {
  
  const REASONABLE_RAM_COPY_TIME_MS = 5000;
  const status:GpuAllocationStatus = {
    totalAllocatedSize:0,
    availableStorage:await estimateAvailableStorage() || 0,
    code:GpuAllocationStatusCode.INITIALIZING,
    maxAttemptSize,
    slowestCopyRate:-1,
    averageCopyRate:-1,
    fastestCopyRate:-1
  }

  let copyRates:number[] = [];
  let allBuffers:GPUBuffer[] = [];
  try {
    const gpu:GPU|undefined  = window.navigator.gpu;
    if (!gpu)  { 
      status.code = GpuAllocationStatusCode.GPU_NOT_SUPPORTED;
      onGpuAllocationStatus(status);
      return status;
    }

    // Get adapter and device.
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      status.code = GpuAllocationStatusCode.ADAPTER_NOT_AVAILABLE;
      onGpuAllocationStatus(status);
      return status;
    }
    const maxBufferAllocation = adapter.limits.maxBufferSize;
    const allocChunkSize = Math.min(maxBufferAllocation, 1024 * 1024 * 1024); // Balancing efficiency with useful granularity of measured result.
    const writeInterval = Math.floor(allocChunkSize / 16);    
    const device = await adapter.requestDevice({ requiredLimits: { maxBufferSize:allocChunkSize } });
    if (!device) {
      status.code = GpuAllocationStatusCode.DEVICE_NOT_AVAILABLE;
      onGpuAllocationStatus(status);
      return status;
    }

    // Allocate read-back buffer.
    const readBackBuffer = _allocReadBackBuffer(device, allocChunkSize, status);
    if (!readBackBuffer) { onGpuAllocationStatus(status); return status; }
    allBuffers.push(readBackBuffer);

    status.code = GpuAllocationStatusCode.TEST_IN_PROGRESS;
    onGpuAllocationStatus(status);
    
    let bufferNo = 0;
    while(status.totalAllocatedSize < maxAttemptSize) {
      // Check if we're getting low on disk storage, perhaps as a consequence of allocating via unified memory architecture into virtual memory.
      status.availableStorage = await estimateAvailableStorage();
      if (status.availableStorage < OS_VIRTUAL_MEMORY_BUFFER) {
        status.code = GpuAllocationStatusCode.LOW_STORAGE_AVAILABILITY;
        status.errorInfo = `Available storage is low, stopping at ${status.totalAllocatedSize} bytes.`;
        break;
      }

      // Allocate the buffer.
      const testBuffer = _allocTestBuffer(device, allocChunkSize, ++bufferNo, status);
      if (!testBuffer) { onGpuAllocationStatus(status); return status; }
      allBuffers.push(testBuffer);
      
      // Write across entire buffer to detect virtual memory page faults.
      const writeValue = bufferNo % 256; // use a different value for each buffer to ensure we don't get false positives on readback.
      const writeArray = new Uint8Array(testBuffer.getMappedRange());
      for(let writeI = 0; writeI < allocChunkSize; writeI += writeInterval) { writeArray[writeI] = writeValue; }
      testBuffer.unmap();

      // Copy test buffer to readback buffer for verification.
      const commandEncoder = device.createCommandEncoder();
      commandEncoder.copyBufferToBuffer(testBuffer, 0, readBackBuffer, 0, allocChunkSize);
      device.pushErrorScope('out-of-memory');
      device.pushErrorScope('internal');
      device.pushErrorScope('validation');
      const beforeCopyTime = performance.now();
      device.queue.submit([commandEncoder.finish()]);
      await device.queue.onSubmittedWorkDone();
      const copyTime = performance.now() - beforeCopyTime;
      const validationError = await device.popErrorScope();
      const internalError = await device.popErrorScope();
      const oomError = await device.popErrorScope();
      if (validationError || internalError || oomError) {
        if (validationError) {
          status.code = GpuAllocationStatusCode.VALIDATION_ERROR;
          status.errorInfo = validationError.message;
        }
        if (internalError) {
          status.code = GpuAllocationStatusCode.INTERNAL_ERROR;
          status.errorInfo = internalError.message;
        }
        if (oomError) {
          status.code = GpuAllocationStatusCode.OOM_ERROR;
          status.errorInfo = oomError.message;
        }
        break;
      }

      // If copy takes too long, I'm likely using virtual memory with an integrated GPU. Not necessarily a problem, 
      // but it it's too slow, we should stop and use the total for memory that was accessed faster.
      copyRates.push(allocChunkSize / copyTime);
      _setCopyRateMetrics(copyRates, status);
      if (copyTime > REASONABLE_RAM_COPY_TIME_MS) {
        status.code = GpuAllocationStatusCode.COPY_TOO_SLOW;
        status.errorInfo = `Copy took too long (${copyTime} ms for ${allocChunkSize} bytes).`;
        break; 
      }

      // Check that the buffer was written correctly.
      await readBackBuffer.mapAsync(GPUMapMode.READ, 0, allocChunkSize);
      const readArray = new Uint8Array(readBackBuffer.getMappedRange(0, allocChunkSize));
      let readI = 0;
      for (; readI < allocChunkSize; readI += writeInterval) { if (readArray[readI] !== writeValue) break; }
      if (readI < allocChunkSize) {
        status.code = GpuAllocationStatusCode.COPY_FAILED;
        status.errorInfo = `Readback verification failed for buffer #${bufferNo}.`;
        break;
      }
      readBackBuffer.unmap();

      // This chunk is good, so we can count it as allocated.
      status.totalAllocatedSize += allocChunkSize;
      const keepGoing = onGpuAllocationStatus(status);
      if (!keepGoing) {
        status.code = GpuAllocationStatusCode.USER_CANCELED;
        onGpuAllocationStatus(status);
        return status;
      }
    }

    if (status.code === GpuAllocationStatusCode.TEST_IN_PROGRESS) status.code = GpuAllocationStatusCode.MAX_ATTEMPT_SIZE_REACHED;
    onGpuAllocationStatus(status);
  } catch (e) {
    status.code = GpuAllocationStatusCode.UNEXPECTED_ERROR;
    status.errorInfo = e instanceof Error ? e.message : String(e);
    onGpuAllocationStatus(status);
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

/*
  This is a tricky bit of code, because if I report a number that is too high it's 
  actually possible to crash the whole frigging operating system. On a unified 
  memory architecture like Macs have, a call to GPU device `createBuffer()` can 
  allocate from system RAM and then virtual memory - not just video memory. So a 
  successful allocation can be made that causes some critical O/S task to be starved 
  of memory, and the system will hang or reboot. So amazingly, in 2025, browser code 
  is able to crash an entire O/S.

  To avoid this, I need to set a responsible upper bound to GPU allocations based 
  on available disk storage. So in the edge case where virtual memory ends up being 
  used, we never exhaust it.
*/
export async function findMaxSafelyTestableAllocation():Promise<number> {
  
  const availableStorage = await estimateAvailableStorage();
  
  // If I can't get a storage estimate, I'll use system memory instead as an upper bound to protect 
  // against over-allocating in unified memory architectures.
  if (!availableStorage) return estimateSystemMemory();
  
  // It's not my aim to test all of virtual memory - ideally, we aren't using virtual at all. Bound 
  // it to a possible amount of video memory for high end hardware.
  return Math.min(availableStorage, CRAZY_HARDWARE_ALLOC_SIZE);
}