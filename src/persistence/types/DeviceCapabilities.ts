import MemoryTestStatusCode from '@/worker/types/MemoryTestStatusCode';

type DeviceCapabilities = {
  memoryCopyRate:number;
  maxGpuAllocationSize:number;
  lastTestStatusCode:MemoryTestStatusCode;
  lastTestTimestamp:number;
}

export default DeviceCapabilities;