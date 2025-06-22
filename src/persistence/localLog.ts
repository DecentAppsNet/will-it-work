import { deleteByKey, getAllKeysAtPath, getText, setText } from "./pathStore";

const WRITE_DELAY_MS = 3000;
const DAY = 24 * 60 * 60 * 1000;
const UNINITIALIZED_DAY_PATH = 'UNINITIALIZED_DAY_PATH';

let theDayBuffer:string[] = [];
let theDayBufferPath:string = UNINITIALIZED_DAY_PATH;
let thePreviousDayPath:string = UNINITIALIZED_DAY_PATH;
let thePreviousDayEntryCount:number = 0; // When >0, it means the buffer has entries from the previous day that haven't been written yet.
let theDebouncedWriteTimer:number|null = null;

// Format day path as YYYY-MM-DD.
function _getDayPath(timestamp:number):string {
  const date = new Date(timestamp);
  const dayPath = date.getFullYear().toString().padStart(4, '0') + '-' +
    (date.getMonth() + 1).toString().padStart(2, '0') + '-' +
    (date.getDate()).toString().padStart(2, '0');
  return dayPath;
}

function _dayPathToKey(dayPath:string):string {
  return `/log/${dayPath}.txt`;
}

function _isRunningOnDedicatedWorker():boolean {
  return typeof self !== 'undefined' && self.constructor.name === 'DedicatedWorkerGlobalScope';
}

async function _writeDayBuffer() {
  if (!theDayBuffer.length) return; // Nothing to write.
  try {
    if (!theDayBufferPath) throw Error('Unexpected');
    if (thePreviousDayEntryCount) {
      if (thePreviousDayPath === UNINITIALIZED_DAY_PATH) throw Error('Unexpected');
      const previousDayBuffer = theDayBuffer.slice(0, thePreviousDayEntryCount);
      theDayBuffer = theDayBuffer.slice(thePreviousDayEntryCount); // Keep only the current day's entries in the buffer.
      const previousDayKey = _dayPathToKey(thePreviousDayPath);
      thePreviousDayEntryCount = 0;
      thePreviousDayPath = UNINITIALIZED_DAY_PATH;
      await setText(previousDayKey, previousDayBuffer.join('\n'));
    }
    await setText(_dayPathToKey(theDayBufferPath), theDayBuffer.join('\n'));
  } catch (error) {
    console.error('Unexpected error writing log buffer:', error);
  }
}

async function _initDayBuffer(dayPath:string) {
  const logText = await getText(_dayPathToKey(dayPath));
  if (logText) theDayBuffer = logText.split('\n');
  theDayBufferPath = dayPath;
}

export async function log(text:string, flushImmediately:boolean = false) {
  if (_isRunningOnDedicatedWorker()) throw Error('Unexpected - log() should not be called in worker thread.');

  const timestamp = Date.now();
  const dayPath = _getDayPath(timestamp);
  if (theDayBufferPath === UNINITIALIZED_DAY_PATH) await _initDayBuffer(dayPath);

  if (theDayBufferPath !== dayPath) { // New day, so set vars for next write to write old day and start a new buffer.
    thePreviousDayEntryCount = theDayBuffer.length; 
    thePreviousDayPath = theDayBufferPath;
    theDayBufferPath = dayPath; // Update the current day path
  }
  const date = new Date(timestamp);
  const timePrefix = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  theDayBuffer.push(`[${timePrefix}] ${text}`);

  if (flushImmediately) {
    await _writeDayBuffer();
    return;
  }

  if (theDebouncedWriteTimer) clearTimeout(theDebouncedWriteTimer);
  theDebouncedWriteTimer = setTimeout(async () => {
    await _writeDayBuffer();
    theDebouncedWriteTimer = null;
  }, WRITE_DELAY_MS) as unknown as number;
}

// Intentionally not exported as a roadbump against sending logs to a service.
async function _getLogText(includeDayCount:number):Promise<string> {
  let dayPaths:string[] = [];
  let time = Date.now();
  for(let i = 0; i < includeDayCount; ++i) {
    const dayPath = _getDayPath(time);
    dayPaths.unshift(dayPath);
    time -= DAY;
  }

  let logText = '';
  for(let i = 0; i < dayPaths.length; ++i) {
    const dayPath = dayPaths[i];
    const dayLogText = await getText(_dayPathToKey(dayPath));
    if (!dayLogText) continue; // Skip empty days.
    logText += `--- ${dayPath} ---\n`;
    logText += dayLogText;
  }
  return logText;
}

// Supporting use case of user voluntarily, explicitly pasting the log into an email, bug report, or something similar.
export async function copyLogToClipboard(includeDayCount:number) {
  const logText = await _getLogText(includeDayCount);
  if (logText) {
    self.navigator.clipboard.writeText(logText).then(() => {
      console.log("Log copied to clipboard.");
    }).catch(err => {
      console.error("Failed to copy log to clipboard: ", err);
    });
  }
}

export async function deleteOldLogMessages(olderThanDayCount:number) {
  // Generate the key for the oldest day to preserve.
  const oldestDayPath = _getDayPath(Date.now() - olderThanDayCount * DAY);
  const thresholdKey = _dayPathToKey(oldestDayPath);

  // Because the keys are stored as `/log/YYYY-MM-DD.txt`, they are chronologically sortable.
  // Find each key that came before the threshold key and delete it.
  const keys = await getAllKeysAtPath('/log');
  const keysToDelete = keys.filter(key => key < thresholdKey);
  for (const key of keysToDelete) {
    deleteByKey(key); // Intentionally not awaiting this - let it run in the background.
  }
}