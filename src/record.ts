import { env } from 'cloudflare:workers';
import { endpointURLString } from '@cloudflare/playwright';
import type { Step, RecordOptions, StructuredStep } from './utils/steps';
import { runSteps } from './utils/steps';
import rrwebInjected from '../dist/injected/rrweb.js.txt';
import { createWorkersAI } from 'workers-ai-provider';
import { Stagehand } from '@cloudflare/stagehand';
import { AISdkClient } from '@cloudflare/stagehand/llm/aisdk';

export async function record({ steps, options }: { steps: Step[]; options?: RecordOptions }) {
    const endpointUrl = endpointURLString("MYBROWSER");
    const workersai = createWorkersAI({
      binding: env.AI,
    });
  
    const stagehand = new Stagehand({
      env: "LOCAL",
      verbose: 2,
      localBrowserLaunchOptions: {
        cdpUrl: endpointUrl,
      },
      llmClient: new AISdkClient({
        // @ts-ignore
        model: workersai("@cf/meta/llama-4-scout-17b-16e-instruct"),
      }),

      logger: ({ category, message }) => console.log(`\x1b[36m${(category || 'unknown').padStart(11)}\x1b[0m ${message}`),
    });
	await stagehand.init();
	const { page } = stagehand;

	// Collect events in the Worker (persists across navigations)
	const events: any[] = [];
	await page.exposeFunction('sendToWorker', (ev: any) => events.push(ev));

	// Install rrweb on *every* new document and start recording immediately.
	// Also buffer events until sendToWorker is present.
	await page.addInitScript(rrwebInjected);

	// If no explicit 'goto' in steps, navigate once up-front.
	if (!steps.some((s) => (s as StructuredStep).action === 'goto')) {
		const url = options?.url ?? 'https://example.com';
		await page.goto(url, { waitUntil: 'load' });
	}

	// Run caller steps (may include further navigations — rrweb stays active via addInitScript)
	await runSteps(stagehand, steps, {
		url: options?.url,
		maxSteps: options?.maxSteps ?? 50,
		stepTimeoutMs: options?.stepTimeoutMs ?? 15_000,
		restrictHost: options?.restrictHost ?? null,
	});

	// small tail to capture trailing activity
	await page.waitForTimeout(500);

	await stagehand.close();

	return new Response(JSON.stringify({ count: events.length, events }), {
		headers: { 'content-type': 'application/json' },
	});
}
