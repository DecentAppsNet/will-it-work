import { byteCountToGb, bytesPerMsecToGbPerSec } from "@/common/memoryUtil";
import { GpuAllocationStatus } from "../memoryTest";

const messages = [
  `I'm going to test the video memory on your device.`,
  `Good news! We've got at least {ALLOCATED_GB} gigabytes. It's a start.`,
  `Why must this testing be done?`,
  `I need to know how much video memory will be available to use for loading models.`,
  `The "L" in "LLMs" stands for "Large". These models take up gigabytes of space.`,
  `Usually, it's a simple thing to learn available memory.`,
  `But for security reasons, web browsers won't tell me how much is available.`,
  `The only way to find out how much video memory is available is to try allocating it.`,
  `So I just keep on asking for memory until the browser refuses.`,
  `And after that failure, I know what the limit is.`,
  `It's like asking a friend for money.`, 
  `You don't just ask, "what's the largest amount you're willing to give me?"`,
  `The browser or your friend would be suspicious of your intentions.`,
  `In my case, I just want to have a clear idea of what LLMs we can put on your browser.`,
  `Hey, {ALLOCATED_GB} gigabytes--not bad! You can run a lot of nice, general-purpose LLMs with that.`,
  `I'm also checking for a few other things like...`,
  `Can I write values to the memory and read them back?`,
  `Call me paranoid, but I need to prove it's real actual memory I can use.`,
  `Is the speed of accessing the memory going to be fast enough for executing prompts against LLMs?`,
  `So far we've been averaging {AVERAGE_COPY_RATE} gigabytes per second.`,
  `That's not bad.`,
  `It did dip down to {SLOWEST_COPY_RATE} gigabytes per second at one point.`,
  `But it also peaked once at {FASTEST_COPY_RATE} GB/sec.`,
  `And I'm checking your available disk storage as I go to prevent system instability.`,
  `You've got {AVAILABLE_STORAGE} gigs of free disk space available right now.`,
  `So you're fine. I'll cancel the test if it drops too low.`,
  `You might think I'll run out of things to say on this memory test.`,
  `But don't you worry - I got plenty.`,
  `{ALLOCATED_GB} gigabytes! Outstanding.`,
  `It's gonna be funtime frolics for you and me and those {ALLOCATED_GB} gigabytes.`,
  `We don't need no stinking cloud, my friend. Got the power right here!`,
  `Do you know why this local LLM stuff is so good?`,
  `Multiple reasons - let me explain...`,
  `First, privacy.`,
  `When you use a local LLM, nobody can spy on your conversations and queries.`,
  `Everybody says they're respecting your privacy.`,
  `They all got a privacy policy you can read. Well, good for them.`,
  `But you know what's better than trusting a corporation to look after your interests?`,
  `Electrocution?... eating a sack of pennies?... pretty much anything?`,
  `Dude! {ALLOCATED_GB} gigabytes. What are you going to do with it all?`,
  `Second benefit of local LLMs - model autonomy.`,
  `In other words, you get to decide what model you will use.`,
  `Why is this important?`,
  `If there was only one dictionary in the World, would you trust it?`,
  `Or one encyclopedia? One search engine? One social media platform?`,
  `LLMs are fast becoming the main way of influencing people's behavior.`,
  `Remember how people fought over SEO in search listings and advertising?`,
  `The battleground is moving to the models.`, 
  `Expect bias and third-party agendas in future LLMs.`,
  `If the LLM is cloud-hosted, facts can shift and disappear...`,
  `faster than you can say "Winston Smith".`,
  `It becomes important to keep specific versions of models to defend against manipulation.`,
  `Frigging {ALLOCATED_GB} gigabytes. Let's go!`,
  `Third benefit of local LLMs - experimentation decoupled from business models.`,
  `Software developers can try out ideas without having to find a way to pay for LLM hosting.`,
  `It's a sad world when every new idea needs funding before it steps out of its crib.`,
  `With local LLMs, the platform for seeing these fresh, not-yet-successful app ideas is your device.`,
  `You can lend your {ALLOCATED_GB} gigabytes of video memory to some indie software dev.`,
  `And that gives them room to create.`,
  `Humans need to be playful, you know. It's a source of great things.`,
  `{ALLOCATED_GB} gigabytes. That's like a whole squirrel brain's worth.`,
  `And the fourth benefit of local LLMs - you can run them offline.`,
  `You can run them offline, my friend!`,
  `On a plane, on a train, in a car, in a bar, in a jar, anywhere you are!`,
  `{ALLOCATED_GB} gigabytes! What a fantastic journey this has become.`,
  `I've been thinking about another benefit of local LLMs.`,
  `It's more debatable though.`,
  `Think about energy consumption.`, 
  `We're building these big data centers to run LLMs.`,
  `They use a lot of power, and water for cooling.`,
  `Arguably, these data centers are more efficient than running LLMs on your device.`,
  `But, I think we're being shielded from the true cost of running LLMs.`,
  `With local LLMs, you can see the cost of running them on your device.`,
  `You can see how much power is being consumed, and you can make choices.`,
  `So it seems to me that the net effect of people running local LLMs...`,
  `is that it will lead to more efficient use of energy overall.`,
  `But I could be wrong.`,
  `{ALLOCATED_GB}! Is there no amount of memory I can't allocate?`,
  `I don't want to pretend local LLMs are better than cloud LLMs in every way.`,
  `There are plenty of advantages cloud LLMs have over local.`,
  `Let's be honest - local LLMs are the underdogs in terms of overall capabilities.`,
  `But there should be room for both kinds of solutions.`,
  `And as popularity of local LLMs grows, so will the capabilities.`,
  `{ALLOCATED_GB} gigabytes. It's breathtaking, I tell you!`,
  `You're Icarus, my buddy.`,
  `And we're gonna fly all the way to the sun!`
];

let startConversationTime = Date.now();
let lastAllocatedSize = 0;
const TIME_PER_LINE = 4000;

function _replaceVariables(message:string, gpuAllocationStatus:GpuAllocationStatus):string {
  if (!message.includes('{')) return message; // No variables to replace, return as is.

  const allocatedGb = byteCountToGb(gpuAllocationStatus.totalAllocatedSize);
  const availableStorageGb = byteCountToGb(gpuAllocationStatus.availableStorage);
  const slowestCopyRate = bytesPerMsecToGbPerSec(gpuAllocationStatus.slowestCopyRate);
  const fastestCopyRate = bytesPerMsecToGbPerSec(gpuAllocationStatus.fastestCopyRate);
  const averageCopyRate = bytesPerMsecToGbPerSec(gpuAllocationStatus.averageCopyRate);

  let m = message;
  m = m.replaceAll('{ALLOCATED_GB}', '' + allocatedGb);
  m = m.replaceAll('{AVERAGE_COPY_RATE}', '' + averageCopyRate);
  m = m.replaceAll('{SLOWEST_COPY_RATE}', '' + slowestCopyRate);
  m = m.replaceAll('{FASTEST_COPY_RATE}', '' + fastestCopyRate);
  m = m.replaceAll('{AVAILABLE_STORAGE}', '' + availableStorageGb);
  
  return m;
}

export function getMessage(gpuAllocationStatus:GpuAllocationStatus):string {
  if (lastAllocatedSize === 0) {
    if (gpuAllocationStatus.totalAllocatedSize > 0) startConversationTime = Date.now(); // Set start time now to avoid showing messages during memory test setup.
    lastAllocatedSize = gpuAllocationStatus.totalAllocatedSize;
    return _replaceVariables(messages[0], gpuAllocationStatus);
  }

  const elapsedTime = Date.now() - startConversationTime;
  const totalAllocatedSize = gpuAllocationStatus.totalAllocatedSize;
  lastAllocatedSize = totalAllocatedSize;

  const nextMessageNo = Math.floor(elapsedTime / TIME_PER_LINE);

  if (nextMessageNo >= messages.length) return ``;
  return _replaceVariables(messages[nextMessageNo], gpuAllocationStatus);
}

export function resetConversation():void {
  startConversationTime = Date.now();
  lastAllocatedSize = 0;
}

export function getFinalMessage(_gpuAllocationStatus:GpuAllocationStatus):string {
  return `Anyhow... we're done testing!`;
}