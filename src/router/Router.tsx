import { useState, useEffect } from "react";
import HomeScreen from "@/homeScreen/HomeScreen";
import MemoryTestScreen from "@/memoryTestScreen/MemoryTestScreen";

const DEFAULT_SCREEN = HomeScreen.name;

let theSetScreen:Function|null = null;

export function setScreen(screen:string) {
  if (!theSetScreen) throw new Error("Unexpected");
  theSetScreen(screen);
}

function Router() {
  const [screen, setScreen] = useState<string>(DEFAULT_SCREEN);

  useEffect(() => { 
    theSetScreen = setScreen; 
    return () => { theSetScreen = null; };
  }, []);

  switch(screen) {
    case HomeScreen.name: return <HomeScreen />;
    case MemoryTestScreen.name: return <MemoryTestScreen />;

    default:
      console.error(`Unknown screen: ${screen}`);
      return <div>Error: Unknown screen</div>;
  }
}

export default Router;