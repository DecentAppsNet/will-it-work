import DeviceCapabilities from "./types/DeviceCapabilities";
import { getText, setText } from './pathStore';

const PATH = '/deviceCapabilities.json';

export async function getDeviceCapabilities():Promise<DeviceCapabilities|null> {
  const json = await getText(PATH);  
  if (!json) return null;
  try {
    const capabilities:DeviceCapabilities = JSON.parse(json);
    return capabilities;
  } catch (e) {
    console.error("Failed to parse device capabilities JSON:", e);
    return null;
  }
}

export async function putDeviceCapabilities(capabilities:DeviceCapabilities) {
  const json = JSON.stringify(capabilities);
  return await setText(PATH, json);
}