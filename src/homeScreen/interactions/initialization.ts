import { formatByteCount, GIGABYTE, overrideSystemMemory } from "@/common/memoryUtil";
import CategoryCheckInfo from "../types/CategoryCheckInfo"
import { hasStorageSupport, hasWasmSupport, hasWebGpuSupport, overrideStorageSupport, overrideWasmSupport, overrideWebGpuSupport } from "@/common/featureUtil";
import { estimateAvailableStorage, overrideAvailableStorage } from "@/common/storageUtil";
import { applyTestOverrides, isServingLocally } from "@/developer/devEnvUtil";
import { resetConversation } from "@/memoryTestScreen/interactions/conversation";

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
function _checkGpuMemory(areBrowserFeaturesAvailable:boolean, isEnoughDiskStorageAvailable:boolean):CategoryCheckInfo {
  const subItems:string[] = [];
  
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

export async function init():Promise<InitResults> {
  const categoryChecks:CategoryCheckInfo[] = [];

  // Apply developer overrides of system metrics if they've been set in querystring.
  applyTestOverrides();

  resetConversation();

  const browserFeaturesCheck = _checkBrowserFeatures();
  const areBrowserFeaturesAvailable = browserFeaturesCheck.status === "success";
  const diskSpaceCheck = await _checkDiskSpace();
  const isEnoughDiskStorageAvailable = diskSpaceCheck.status === "success";
  const gpuMemoryCheck = _checkGpuMemory(areBrowserFeaturesAvailable, isEnoughDiskStorageAvailable);
  
  categoryChecks.push(browserFeaturesCheck);
  categoryChecks.push(diskSpaceCheck);
  categoryChecks.push(gpuMemoryCheck);

  const fromAppName = new URLSearchParams(window.location.search).get('fromAppName') || null;

  const disableMemoryTest = !areBrowserFeaturesAvailable || !isEnoughDiskStorageAvailable;
  return { categoryChecks, disableMemoryTest, fromAppName };
}