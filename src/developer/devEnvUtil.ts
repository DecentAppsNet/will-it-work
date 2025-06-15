import { overrideStorageSupport, overrideWasmSupport, overrideWebGpuSupport } from "@/common/featureUtil";
import { overrideSystemMemory } from "@/common/memoryUtil";
import { overrideAvailableStorage } from "@/common/storageUtil";

function isIpAddress(hostName:string):boolean {
  return hostName.match(/^\d+\.\d+\.\d+\.\d+$/g) !== null;
}

export function isServingLocally() {
  const hostName = window.location.hostname;
  return hostName === "localhost" || isIpAddress(hostName);
}

export function applyTestOverrides():void {
  function _getBooleanOverride(paramName:string):boolean|null {
    const urlParams = new URLSearchParams(window.location.search);
    const paramValue = urlParams.get(paramName);
    if (paramValue === null) return null;
    return paramValue.toLowerCase() === 'true';
  }

  function _getNumberOverride(paramName:string):number|null {
    const urlParams = new URLSearchParams(window.location.search);
    const paramValue = urlParams.get(paramName);
    if (paramValue === null) return null;
    return parseFloat(paramValue);
  }

  overrideWebGpuSupport(_getBooleanOverride('webGpuSupport'));
  overrideWasmSupport(_getBooleanOverride('wasmSupport'));
  overrideStorageSupport(_getBooleanOverride('storageSupport'));
  overrideAvailableStorage(_getNumberOverride('availableStorage'));
  overrideSystemMemory(_getNumberOverride('systemMemory'));
}