import { GpuAllocationStatusCode } from '@/memoryTestScreen/memoryTest';

type DeviceCapabilities = {
  memoryCopyRate:number;
  maxGpuAllocationSize:number;
  lastTestStatusCode:GpuAllocationStatusCode;
  lastTestTimestamp:number;
}

export default DeviceCapabilities;