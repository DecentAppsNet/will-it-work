export const KILOBYTE = 1024;
export const MEGABYTE = KILOBYTE * 1024;
export const GIGABYTE = MEGABYTE * 1024;

export function byteCountToKb(byteCount:number, decimalPlaces:number = 1):number {
  return Math.round((byteCount / KILOBYTE) * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

export function byteCountToMb(byteCount:number, decimalPlaces:number = 1):number {
  return Math.round((byteCount / MEGABYTE) * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

export function byteCountToGb(byteCount:number, decimalPlaces:number = 1):number {
  return Math.round((byteCount / GIGABYTE) * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

export function formatByteCount(byteCount:number):string {
  if (byteCount < KILOBYTE) return `${Math.round(byteCount)} B`;
  else if (byteCount < MEGABYTE) return `${byteCountToKb(byteCount)} KB`;
  else if (byteCount < GIGABYTE) return `${byteCountToMb(byteCount)} MB`;
  else return `${byteCountToGb(byteCount)} GB`;
}

type NullableNumber = number | null;
let availableSystemMemoryOverride:NullableNumber = null;

export function estimateSystemMemory():number {
  if (availableSystemMemoryOverride !== null) return availableSystemMemoryOverride;
  if ('deviceMemory' in navigator) return (navigator as any).deviceMemory;
  if ('memory' in performance) return (performance as any).memory.jsHeapSizeLimit;
  return 0;
}

export function overrideSystemMemory(memoryInBytes:NullableNumber):void {
  availableSystemMemoryOverride = memoryInBytes;
}