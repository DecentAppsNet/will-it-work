import { GpuAllocationStatus } from "../memoryTest";

const messages = [
  `I'm going to test the video memory on your device.`, // 0
  `Good news! We've got at least one entire gigabyte. It's a start.`,
  `Why must this testing be done?`,
  `I need to know how much video memory will be available to use for loading models.`,
  `The "L" in "LLMs" stands for "Large". These models take up gigabytes of space.`,
  `Usually, it's a simple thing to learn available memory.`, // 5
  `But for security reasons, web browsers won't tell me how much is available.`,
  `(The idea behind that design is to prevent using characteristics of your system to "fingerprint" you.)`,
  `Hey, 8 gigabytes--not bad! You can run a lot of nice, general-purpose LLMs with that.`,
  `On a browser, the only way to find out how much video memory is available, is to try allocating it.`,
  `So I just keep on asking for memory until the browser refuses.`, // 10
  `And after that failure, I know what the limit is.`,
  `It's like asking a friend for money.`, 
  `You can't just ask, "what's the largest amount you're willing to give me?"`,
  `The browser or your friend would be suspicious of your intentions.`,
  `But in my case, I just want to have a clear idea of what LLMs we can put on your browser.`, // 15
  `16 gigabytes! Outstanding.`,
  `We don't need no stinking cloud, my friend. Got the power right here!`,
  `I'm also checking for a few other things like...`,
  `Can I write values to the memory and read them back?`,
  `Is the speed of accessing the memory going to be fast enough for executing prompts against LLMs?`, // 20
  `And I'm checking your available disk storage as I go to prevent system instability.`,
  `You might worry that I'll run out of things to say on this memory test.`,
  `But I've got at least 256 things to say.`,
  `I'm biased towards base 2 numbers, like 8 and 16 and 256.`,
  `Or should I say... 100, 1000, and 100000000?`, // 25
  `Don't worry, I'll keep converting them to base 10 for ya. It's no hassle.`,
  `Am I talking too much? Let's just count together for a bit.`,
  `11100 (28)`,
  `11101 (29)`,
  `11110 (30)`, // 30
  `11111 (31)`,
  `Dude! Thirty two gigabytes you got. What are you going to do with it all?`,
  `Funtime frolics for you and me and the gigabytes.`,
  `Do you know why this is local LLM stuff is so good?`,
  `Multiple reasons - let me explain...`, // 35
  `First, privacy. When you use a local LLM, nobody can spy on your conversations and queries.`,
  `Everybody says they're respecting your privacy. They all got a privacy policy you can read.`,
  `But you know what's better than trusting a corporation to look after your interests?`,
  `Electrocution?... eating a sack of pennies?... pretty much anything?`,
  `Forty gigabytes! Woohoo! (We can celebrate a base 10 milestones too. It's not condescending.)`, // 40
  `Second benefit of local LLMs - model autonomy.`,
  `You get to decide what model you will use. Why is this important?`,
  `LLMs are fast becoming the main way of influencing people's behavior.`,
  `Remember how people fought over SEO in search listings and advertising?`,
  `The battleground is moving to the models - expect bias and third-party agendas in future LLMs.`, // 45
  `If the LLM is cloud-hosted, facts can shift and disappear faster than you can say "Winston Smith".`,
  `It becomes important to keep specific versions of models to defend against manipulation.`,
  `Forty-frigging-eight gigabytes. Let's go!`,
  `Third benefit of local LLMs - experimentation decoupled from business models.`,
  `Software developers can try out ideas without having to find a way to pay for LLM hosting.`, // 50
  `It's a sad World when every new idea needs funding before it can get out of its crib.`,
  `With local LLMs, the platform for seeing these fresh, not-yet-successful app ideas is your device.`,
  `You can lend your 53 gigabytes of video memory to some indie software dev.`,
  `And that gives them room to not be so serious and business-minded in their very first steps.`,
  `Humans need to be playful, you know. It's a source of great things.`, // 55
  `Fifty-six. Did you know we were gonna hit 56 gigabytes when we started this journey?`
];

let startConversationTime = Date.now();
const TIME_PER_LINE = 3000;

export function nextMessage(_gpuAllocationStatus:GpuAllocationStatus):string {
 const elapsedTime = Date.now() - startConversationTime;
 const nextMessageNo = Math.floor(elapsedTime / TIME_PER_LINE);
 if (nextMessageNo >= messages.length) {
   return `That's all I have to say for now. It's been nice talking at you.`;
 }
 return messages[nextMessageNo];
}

export function resetConversation():void {
  startConversationTime = Date.now();
}