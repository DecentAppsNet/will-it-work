enum MemoryTestStatusCode {
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
  GPU_DRIVER_FAILURE = 'GPU driver failure',
  USER_CANCELED = 'Allocation canceled by user',
  UNEXPECTED_ERROR = 'Unexpected error'
}

export function isResolvedStatusCode(code:MemoryTestStatusCode):boolean {
  return code !== MemoryTestStatusCode.TEST_IN_PROGRESS;
}

export default MemoryTestStatusCode;