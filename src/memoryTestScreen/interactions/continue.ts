import HomeScreen from "@/homeScreen/HomeScreen";
import { setScreen } from "@/router/Router";
import { GpuAllocationStatus } from "../memoryTest";

export function continueToTestResults(status: GpuAllocationStatus) {
  console.log("Continuing to test results with status:", status);
  
  setScreen(HomeScreen.name);
  //setScreen(MemoryTestResultsScreen.name, { status });
}