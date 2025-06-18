import { bytesPerMsecToGbPerSec, formatByteCount, GIGABYTE } from "@/common/memoryUtil";
import CategoryCheckInfo from "../types/CategoryCheckInfo"
import { hasStorageSupport, hasWasmSupport, hasWebGpuSupport } from "@/common/featureUtil";
import { estimateAvailableStorage } from "@/common/storageUtil";
import { applyTestOverrides } from "@/developer/devEnvUtil";
import { resetConversation } from "@/memoryTestScreen/interactions/conversation";
import { getDeviceCapabilities } from "@/persistence/deviceCapabilities";
import MemoryTestStatusCode from "@/worker/types/MemoryTestStatusCode";

export type InitResults = {
  categoryChecks:CategoryCheckInfo[],
  disableMemoryTest:boolean,
  fromAppName:string|null
}

function _checkBrowserFeatures():CategoryCheckInfo {
  const hasWebGpu = hasWebGpuSupport();
  const hasWasm = hasWasmSupport();
  const hasStorageApi = hasStorageSupport();

  const subItems = [
    hasWebGpu ? `WebGPU is supported` : `WebGPU is not supported`,
    hasWasm ? `WebAssembly is supported` : `WebAssembly is not supported`,
    hasStorageApi ? `Storage API is supported` : `Storage API is not supported`
  ];

  const status = hasWebGpu && hasWasm && hasStorageApi ? "success" : "failed";
  const summary = status === 'failed' 
    ? "Your browser does not support all the required features for local LLMs."
    : "Your browser has access to the right features."
  
  return { summary, status, subItems, visible:false };
}

async function _checkDiskSpace():Promise<CategoryCheckInfo> {
  const result:CategoryCheckInfo = {
    summary: "",
    status: "unknown",
    subItems: [],
    visible: false
  };

  try {
    if (!hasStorageSupport()) {
      result.summary = "Could not find out how much disk space is available.";
      result.status = "failed";
      result.subItems.push(`Storage API is not supported`);
      return result;
    }

    const available = await estimateAvailableStorage();
    if (!available) {
      result.summary = "Could not find out how much disk space is available.";
      result.status = "failed";
      result.subItems.push(`Unable to retrieve storage information`);
      return result;
    }

    const TOO_LOW = 16 * GIGABYTE;
    const RUN_MOST_MODELS = 32 * GIGABYTE;
    const RUN_EVERY_MODEL = 256 * GIGABYTE;


    if (available < TOO_LOW) {
      result.summary = "You do not have enough disk space to run most models.";
      result.status = "failed";
      result.subItems.push(`Only ${formatByteCount(available)} of free disk space available`);
      result.subItems.push(`For system stability, it is recommended to have at least ${formatByteCount(TOO_LOW)} of free disk space.`);
      result.subItems.push(`You can free disk space by deleting unused files or applications.`);
      return result;
    }

    result.status = "success";
    result.subItems.push(`${formatByteCount(available)} of free disk space available`);

    if (available < RUN_MOST_MODELS) {
      result.summary = "You have enough disk space to run some smaller models safely.";
      result.subItems.push(`You can free disk space by deleting unused files or applications.`);
      return result;
    }

    if (available < RUN_EVERY_MODEL) {
      result.summary = "You have enough disk space to run most models.";
      result.subItems.push(`You can free disk space by deleting unused files or applications.`);
      return result;
    }

    result.summary = "You have enough disk space to run any model available via WebLLM.";
    
  } catch (error) {
    console.error("Error checking disk space:", error);
    result.status = "failed";
    result.subItems.push(`Error checking disk space`);
  }

  return result;
}

// If timestamp is today, returns "Today at 12:00 PM"
// Otherwise, returns short date format like "10/12/2023".
function _describeTime(timestamp:number):string {
  if (!timestamp) return "Unknown time";
  const date = new Date(timestamp);
  const today = new Date();
  if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
    return `today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString();
}

function _describeLimit(statusCode:MemoryTestStatusCode):string {
  switch (statusCode) {
    case MemoryTestStatusCode.MAX_ATTEMPT_SIZE_REACHED: return "The test reached the maximum allocation size.";
    case MemoryTestStatusCode.ALLOCATION_FAILED: return "The test discovered the limit by way of allocation failure.";
    case MemoryTestStatusCode.COPY_FAILED: return "The test discovered the limit when copying failed after an allocation.";
    case MemoryTestStatusCode.COPY_TOO_SLOW: return "The test discovered the limit when copying was too slow after an allocation. (Typically due to use of virtual memory in unified memory architectures.)";
    case MemoryTestStatusCode.VALIDATION_ERROR: return "The test discovered the limit when validation failed after an allocation.";
    case MemoryTestStatusCode.INTERNAL_ERROR: return "The test discovered the limit when an internal error occurred during the test.";
    case MemoryTestStatusCode.OOM_ERROR: return "The test discovered the limit when an out-of-memory error occurred during the test.";
    case MemoryTestStatusCode.LOW_STORAGE_AVAILABILITY: return "The test aborted early due to low storage availability. You might want to run it again after freeing some disk space.";
    case MemoryTestStatusCode.USER_CANCELED: return "I think you canceled the test. You might want to run it again.";
    case MemoryTestStatusCode.GPU_DRIVER_FAILURE: return "The test discovered the limit when the GPU driver failed during the test.";
    default: return "The test discovered the limit in an unexpected way - potentially an internal browser error.";
  }
}

async function _checkGpuMemory(areBrowserFeaturesAvailable:boolean, isEnoughDiskStorageAvailable:boolean):Promise<CategoryCheckInfo> {
  const subItems:string[] = [];

  const deviceCapabilities = await getDeviceCapabilities();
  if (deviceCapabilities && deviceCapabilities.maxGpuAllocationSize > 0) {
    subItems.push(`Based on memory test ran ${_describeTime(deviceCapabilities.lastTestTimestamp)}.`);
    subItems.push(`Your memory copy rate is ${bytesPerMsecToGbPerSec(deviceCapabilities.memoryCopyRate)} gigabytes per second.`);
    subItems.push(_describeLimit(deviceCapabilities.lastTestStatusCode));
    subItems.push(`You can always run the memory test again to update your capabilities.`);
    return {
      summary: `You've got ${formatByteCount(deviceCapabilities.maxGpuAllocationSize)} memory available to run an LLM.`,
      status: "success",
      subItems,
      visible: false
    }
  }
  
  if (!areBrowserFeaturesAvailable) subItems.push(`Couldn't find browser features needed to run a memory test.`);
  if (!isEnoughDiskStorageAvailable) subItems.push(`Couldn't find disk space needed to run a memory test.`);
  if (subItems.length === 0) subItems.push(`You can run a one-time memory test to determine available memory for this session and others.`);
  
  return {
    summary: "Not sure how much video memory you have.",
    status: "unknown",
    subItems,
    visible: false
  };
}

let isInitializing = false;
export async function init():Promise<InitResults|null> {
  if (isInitializing) return null;
  isInitializing = true;
  try {
    const categoryChecks:CategoryCheckInfo[] = [];

    applyTestOverrides(); // Apply developer overrides of system metrics if they've been set in querystring.
    resetConversation();

    const browserFeaturesCheck = _checkBrowserFeatures();
    const areBrowserFeaturesAvailable = browserFeaturesCheck.status === "success";
    const diskSpaceCheck = await _checkDiskSpace();
    const isEnoughDiskStorageAvailable = diskSpaceCheck.status === "success";
    const gpuMemoryCheck = await _checkGpuMemory(areBrowserFeaturesAvailable, isEnoughDiskStorageAvailable);
    
    categoryChecks.push(browserFeaturesCheck);
    categoryChecks.push(diskSpaceCheck);
    categoryChecks.push(gpuMemoryCheck);

    const fromAppName = new URLSearchParams(window.location.search).get('fromAppName') || null;

    const disableMemoryTest = !areBrowserFeaturesAvailable || !isEnoughDiskStorageAvailable;
    return { categoryChecks, disableMemoryTest, fromAppName };
  } finally {
    isInitializing = false;
  }
}