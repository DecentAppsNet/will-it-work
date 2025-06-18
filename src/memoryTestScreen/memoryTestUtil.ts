import { estimateSystemMemory, GIGABYTE } from "@/common/memoryUtil";
import { estimateAvailableStorage } from "@/common/storageUtil";

const CRAZY_HARDWARE_ALLOC_SIZE = 256 * GIGABYTE; // 256 GB - it would be very special hardware that could allocate this much.

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