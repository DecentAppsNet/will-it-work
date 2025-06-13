
function _allocBuffer(device:GPUDevice, size:number, label:string, usage:GPUBufferUsageFlags, mappedAtCreation:boolean, status:GpuAllocationStatus):GPUBuffer|null {
  try {
    return device.createBuffer({size, label, usage, mappedAtCreation});
  } catch (e) {
    status.code = GpuAllocationStatusType.ALLOCATION_FAILED;
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
export enum GpuAllocationStatusType {
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
  UNEXPECTED_ERROR = 'Unexpected error'
}

export type GpuAllocationStatus = {
  totalAllocatedSize:number;
  maxAttemptSize:number;
  code:GpuAllocationStatusType;
  errorInfo?: string; // optional for additional error context
}

export type GpuAllocationStatusCallback = (status:GpuAllocationStatus) => void;

export async function findMaxGpuAllocation(onGpuAllocationStatus:GpuAllocationStatusCallback):Promise<number> {
  const CRAZY_HARDWARE_ALLOC_SIZE = 256 * 1024 * 1024 * 1024 * 1024; // 256 GB - it would be very special hardware that could allocate this much.
  const REASONABLE_RAM_COPY_TIME_MS = 5000;
  const status:GpuAllocationStatus = {
    totalAllocatedSize:0,
    maxAttemptSize:CRAZY_HARDWARE_ALLOC_SIZE,
    code:GpuAllocationStatusType.INITIALIZING
  }

  let allBuffers:GPUBuffer[] = [];
  try {
    const gpu:GPU|undefined  = window.navigator.gpu;
    if (!gpu)  { 
      status.code = GpuAllocationStatusType.GPU_NOT_SUPPORTED;
      onGpuAllocationStatus(status);
      return 0;
    }

    // Get adapter and device.
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      status.code = GpuAllocationStatusType.ADAPTER_NOT_AVAILABLE;
      onGpuAllocationStatus(status);
      return 0;
    }
    const maxBufferAllocation = adapter.limits.maxBufferSize;
    const allocChunkSize = Math.min(maxBufferAllocation, 1024 * 1024 * 1024); // Balancing efficiency with useful granularity of measured result.
    const writeInterval = Math.floor(allocChunkSize / 16);    
    const device = await adapter.requestDevice({ requiredLimits: { maxBufferSize:allocChunkSize } });
    if (!device) {
      status.code = GpuAllocationStatusType.DEVICE_NOT_AVAILABLE;
      onGpuAllocationStatus(status);
      return 0;
    }

    // Allocate read-back buffer.
    const readBackBuffer = _allocReadBackBuffer(device, allocChunkSize, status);
    if (!readBackBuffer) { onGpuAllocationStatus(status); return 0; }
    allBuffers.push(readBackBuffer);

    status.code = GpuAllocationStatusType.TEST_IN_PROGRESS;
    onGpuAllocationStatus(status);
    
    let bufferNo = 0;
    while(status.totalAllocatedSize < CRAZY_HARDWARE_ALLOC_SIZE) {
      // Allocate the buffer.
      const testBuffer = _allocTestBuffer(device, allocChunkSize, ++bufferNo, status);
      if (!testBuffer) { onGpuAllocationStatus(status); return status.totalAllocatedSize; }
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
          status.code = GpuAllocationStatusType.VALIDATION_ERROR;
          status.errorInfo = validationError.message;
        }
        if (internalError) {
          status.code = GpuAllocationStatusType.INTERNAL_ERROR;
          status.errorInfo = internalError.message;
        }
        if (oomError) {
          status.code = GpuAllocationStatusType.OOM_ERROR;
          status.errorInfo = oomError.message;
        }
        break;
      }

      // If copy takes too long, I'm likely using virtual memory with an integrated GPU. Not necessarily a problem, 
      // but it it's too slow, we should stop and use the total for memory that was accessed faster.
      console.log(`Copy took ${copyTime} ms for ${allocChunkSize} bytes.`);
      if (copyTime > REASONABLE_RAM_COPY_TIME_MS) {
        status.code = GpuAllocationStatusType.COPY_TOO_SLOW;
        status.errorInfo = `Copy took too long (${copyTime} ms for ${allocChunkSize} bytes).`;
        break; 
      }

      // Check that the buffer was written correctly.
      await readBackBuffer.mapAsync(GPUMapMode.READ, 0, allocChunkSize);
      const readArray = new Uint8Array(readBackBuffer.getMappedRange(0, allocChunkSize));
      let readI = 0;
      for (; readI < allocChunkSize; readI += writeInterval) { if (readArray[readI] !== writeValue) break; }
      if (readI < allocChunkSize) {
        status.code = GpuAllocationStatusType.COPY_FAILED;
        status.errorInfo = `Readback verification failed for buffer #${bufferNo}.`;
        break;
      }
      readBackBuffer.unmap();

      // This chunk is good, so we can count it as allocated.
      status.totalAllocatedSize += allocChunkSize;
      onGpuAllocationStatus(status);
    }

    if (status.code === GpuAllocationStatusType.TEST_IN_PROGRESS) status.code = GpuAllocationStatusType.MAX_ATTEMPT_SIZE_REACHED;
    onGpuAllocationStatus(status);
  } catch (e) {
    status.code = GpuAllocationStatusType.UNEXPECTED_ERROR;
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
  return status.totalAllocatedSize;
}