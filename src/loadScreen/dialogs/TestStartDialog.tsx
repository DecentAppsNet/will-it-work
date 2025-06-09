import { useState, useEffect } from "react";

import DialogButton from "@/components/modalDialogs/DialogButton";
import DialogFooter from "@/components/modalDialogs/DialogFooter";
import ModalDialog from "@/components/modalDialogs/ModalDialog";
import SystemInfoTable from "./SystemInfoTable";
import { formatByteCount } from "@/common/storageFormatUtil";
import { findMaxGpuAllocation } from "../interactions/memoryTest";

type Props = {
  isOpen:boolean,
  onConfirm:()=>void
}

function _getWebGlInfo():Record<string, string> {
  const result:Record<string, string> = {
    "WebGL Vendor": "Unknown",
    "WebGL Renderer": "Unknown",
    "WebGL Max Texture Size": "Unknown"
  };
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  if (!gl) return result;

  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (!ext) return result;

  const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
  const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

  return { "WebGL Vendor": vendor, "WebGL Renderer": renderer, "WebGL Max Texture Size": maxTextureSize.toString() } as Record<string, string>;
};

async function _getStorageInfo():Promise<Record<string, string>> {
  const result:Record<string, string> = {
    "Storage Quota": "Unknown",
    "Storage Usage": "Unknown",
    "Storage Available": "Unknown"
  };
  if (!navigator.storage || !navigator.storage.estimate) return result;
  const estimate = await navigator.storage.estimate();
  if (!estimate || !estimate.quota) return result;
  result["Storage Quota"] = estimate.quota === undefined ? "Unknown" : formatByteCount(estimate.quota);
  result["Storage Usage"] = estimate.usage === undefined ? "Unknown" : formatByteCount(estimate.usage);
  result["Storage Available"] = estimate.quota === undefined || estimate.usage === undefined 
    ? "Unknown" 
    : formatByteCount(estimate.quota - estimate.usage);
  return result;
}

function _addResult(from:Record<string,string>, to:Record<string,string>) {
 for (const key in from) {
   if (from.hasOwnProperty(key)) {
     to[key] = from[key];
   }
 }
 return to;
}

// TODO refactor later
async function getSystemInfo():Promise<Record<string,string>> {
  const result:Record<string,string> = {
    "Browser": window.navigator.userAgent,
    "WebGPU": !!window.navigator.gpu ? "Supported" : "Not Supported",
    "WebAssembly": !!window.WebAssembly ? "Supported" : "Not Supported"
  };
  _addResult(_getWebGlInfo(), result);
  _addResult(await _getStorageInfo(), result);
  return result;
}

function TestStartDialog(props:Props) {
  const { isOpen, onConfirm } = props;
  const [systemInfo, setSystemInfo] = useState<Record<string,string>>({});
  const [currentTestStatus, setCurrentTestStatus] = useState<string>("");

  useEffect(() => {
    if (Object.keys(systemInfo).length > 0) return; // already loaded
    getSystemInfo().then(nextSystemInfo => setSystemInfo(nextSystemInfo));
  }, [systemInfo]);

  if (!isOpen) return null;

  return (
    <ModalDialog title="Prepare to Load LLM" isOpen={isOpen}>
      <SystemInfoTable records={systemInfo} />
      <p>{currentTestStatus}</p>
      <DialogFooter>
        <DialogButton text="Test Memory" onClick={
          () => findMaxGpuAllocation(status => setCurrentTestStatus(`${status.code} - ${formatByteCount(status.totalAllocatedSize)}`))
        }/>
        <DialogButton text="Start" onClick={onConfirm} isPrimary/>
      </DialogFooter>
    </ModalDialog>
  );
}

export default TestStartDialog;