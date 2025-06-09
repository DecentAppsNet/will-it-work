// Use the appropriate unit to format whole number byte counts for display, e.g. 1023 => "1023 B", 1024 => "1.0 KB", 1048576 => "1.0 MB", etc.
export function formatByteCount(byteCount:number):string {
  if (byteCount < 1024) return `${byteCount} B`;
  else if (byteCount < 1024 * 1024) return `${(byteCount / 1024).toFixed(1)} KB`;
  else if (byteCount < 1024 * 1024 * 1024) return `${(byteCount / (1024 * 1024)).toFixed(1)} MB`;
  else return `${(byteCount / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}