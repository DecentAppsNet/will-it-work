
/* <CategoryCheck summary="Your browser has access to the right features." status="success" subItems={[
  "WebGPU is supported",
  "WebGL is supported",
  "Storage API is supported"
]} visible={visibleCategories >= 1}/>

<CategoryCheck summary="You have enough disk space to store any available model." status="success" subItems={[
  "852 GB of free disk space available",
  "Any model available via WebLLM can be downloaded"
]} visible={visibleCategories >= 2}/>

<CategoryCheck summary="Not sure how much video memory you have." status="unknown" subItems={[
  "You can run a one-time memory test to determine available memory for this session and others."
type InitResults = {

} */

import { formatByteCount } from "@/common/storageFormatUtil";
import CategoryCheckInfo from "../types/CategoryCheckInfo"

export type InitResults = {
  categoryChecks:CategoryCheckInfo[]
}

function _checkBrowserFeatures():CategoryCheckInfo {
  const hasWebGpu = !!window.navigator.gpu;
  const hasWasm = !!window.WebAssembly;
  const hasStorageApi = !!navigator.storage && !!navigator.storage.estimate;

  const subItems = [
    hasWebGpu ? `WebGPU is supported` : `WebGPU is not supported`,
    hasWasm ? `WebAssembly is supported` : `WebAssembly is not supported`,
    hasStorageApi ? `Storage API is supported` : `Storage API is not supported`
  ];

  const status = hasWebGpu && hasWasm && hasStorageApi ? "success" : "failed";
  const summary = status === 'failed' 
    ? "Your browser has access to the right features."
    : "Your browser does not support all the required features for local LLMs.";
  
  return { summary, status, subItems, visible:true };
}

const GIGABYTE = 1024 * 1024 * 1024; // 1 GB in bytes

async function _checkDiskSpace():Promise<CategoryCheckInfo> {
  const result:CategoryCheckInfo = {
    summary: "",
    status: "unknown",
    subItems: [],
    visible: true
  };

  try {
    if (!navigator.storage || !navigator.storage.estimate) {
      result.summary = "Could not find out how much disk space is available.";
      result.status = "failed";
      result.subItems.push(`Storage API is not supported`);
      return result;
    }

    const estimate = await navigator.storage.estimate();
    if (!estimate || estimate.quota === undefined || estimate.usage === undefined) {
      result.summary = "Could not find out how much disk space is available.";
      result.status = "failed";
      result.subItems.push(`Unable to retrieve storage information`);
      return result;
    }

    const quota = estimate.quota;
    const usage = estimate.usage;
    const available = quota - usage;
    const TOO_LOW = 16 * GIGABYTE;
    const RUN_MOST_MODELS = 32 * GIGABYTE;
    const RUN_EVERY_MODEL = 256 * GIGABYTE;


    if (available < TOO_LOW) {
      result.summary = "You do not have enough disk space to run most models.";
      result.status = "failed";
      result.subItems.push(`Only ${formatByteCount(available)} of free disk space available`);
      result.subItems.push(`You can free disk space by deleting unused files or applications.`);
      return result;
    }

    result.status = "success";
    result.subItems.push(`Only ${formatByteCount(available)} of free disk space available`);

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

function _checkGpuMemory():CategoryCheckInfo {
  const subItems = [`You can run a one-time memory test to determine available memory for this session and others.`];
  
  return {
    summary: "Not sure how much video memory you have.",
    status: "unknown",
    subItems,
    visible: true
  };
}

export async function init():Promise<InitResults> {
  const categoryChecks:CategoryCheckInfo[] = [];
  
  categoryChecks.push(_checkBrowserFeatures());
  categoryChecks.push(await _checkDiskSpace());
  categoryChecks.push(_checkGpuMemory());

  return { categoryChecks };
}