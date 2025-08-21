import { env } from 'cloudflare:workers';
import { launch } from '@cloudflare/playwright';
import type { Step, RecordOptions } from './utils/steps';
import { runSteps } from './utils/steps';
import { Context } from 'hono';

let RRWEB_CACHE: string | undefined;

async function loadRrweb(): Promise<string> {
	if (RRWEB_CACHE) return RRWEB_CACHE;
	const res = await fetch('https://cdn.jsdelivr.net/npm/rrweb@2.0.0-alpha.4/dist/rrweb.min.js');
	if (!res.ok) throw new Error(`Failed to fetch rrweb: ${res.status}`);
	RRWEB_CACHE = await res.text();
	return RRWEB_CACHE;
}

export async function record({ steps, options }: { steps: Step[]; options?: RecordOptions }) {
	const rrwebCode = await loadRrweb();
	const browser = await launch(env.MYBROWSER);
	const page = await browser.newPage({ bypassCSP: true });

	const events: any[] = [];
	await page.exposeFunction('sendToWorker', (ev: any) => events.push(ev));

	// If caller didn't include a 'goto', use a default URL first.
	if (!steps.some((s) => s.action === 'goto')) {
		const url = options?.url ?? 'https://example.com';
		await page.goto(url);
	}

	await page.addScriptTag({ content: rrwebCode });

	await page.evaluate(() => {
		// @ts-ignore
		rrweb.record({
			// @ts-ignore
			emit(event) {
				// @ts-ignore
				window.sendToWorker(event);
			},
		});
	});

	// Execute caller-provided steps
	await runSteps(page, steps, {
		url: options?.url,
		maxSteps: options?.maxSteps ?? 50,
		stepTimeoutMs: options?.stepTimeoutMs ?? 15_000,
		restrictHost: options?.restrictHost ?? null,
	});

	// Small tail to capture trailing events
	await page.waitForTimeout(500);
	await browser.close();

	return new Response(JSON.stringify({ count: events.length, events }), {
		headers: { 'content-type': 'application/json' },
	});
}
