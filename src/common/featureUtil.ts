type NullableBoolean = boolean | null;

// Overrides are for testing purposes, to simulate different browser capabilities. 
// When set to null, the actual browser capabilities are used.
let hasWebGpuOverride:NullableBoolean = null;
let hasWasmOverride:NullableBoolean = null;
let hasStorageOverride:NullableBoolean = null;

export function hasWebGpuSupport():boolean {
  return hasWebGpuOverride ?? !!window.navigator.gpu;
}

export function overrideWebGpuSupport(supported:NullableBoolean): void {
  hasWebGpuOverride = supported;
}

export function hasWasmSupport():boolean {
  return hasWasmOverride ?? !!window.WebAssembly
}

export function overrideWasmSupport(supported:NullableBoolean): void {
  hasWasmOverride = supported;
}

export function hasStorageSupport():boolean {
  return hasStorageOverride ?? (!!navigator.storage && !!navigator.storage.estimate);
}

export function overrideStorageSupport(supported:NullableBoolean): void {
  hasStorageOverride = supported;
}

export function clearFeatureSupportOverrides() {
  hasWebGpuOverride = null;
  hasWasmOverride = null;
  hasStorageOverride = null;
}