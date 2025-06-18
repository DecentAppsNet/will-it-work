import MemoryTestStatusCode from './MemoryTestStatusCode';

type MemoryTestStatus = {
  totalAllocatedSize:number;
  maxAttemptSize:number;
  slowestCopyRate:number;
  averageCopyRate:number;
  fastestCopyRate:number;
  availableStorage:number;
  code:MemoryTestStatusCode;
  errorInfo?: string;
}

export default MemoryTestStatus;