import { env } from 'cloudflare:workers';
import { launch } from '@cloudflare/playwright';
import type { Step, RecordOptions } from './utils/steps';
import { runSteps } from './utils/steps';

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

	// Collect events in the Worker (persists across navigations)
	const events: any[] = [];
	await page.exposeFunction('sendToWorker', (ev: any) => events.push(ev));

	// Install rrweb on *every* new document and start recording immediately.
	// Also buffer events until sendToWorker is present.
	await page.addInitScript({
		content: `
${rrwebCode}
;(() => {
  if (window.__rrwebInstalled) return;
  window.__rrwebInstalled = true;

  const queue = [];
  function emit(ev) {
    if (window.sendToWorker) window.sendToWorker(ev);
    else queue.push(ev);
  }
  // Expose for debugging if needed
  window.__rrwebQueue = queue;

  try {
    rrweb.record({
      emit,
      // Optional knobs:
      // recordCanvas: true,
      // inlineStylesheet: true,
      // collectFonts: true,
    });
  } catch (e) {
    console.error('rrweb.record failed in init script:', e);
  }

  // Flush buffered events when sendToWorker appears
  const flush = () => {
    if (window.sendToWorker && queue.length) {
      for (const ev of queue) window.sendToWorker(ev);
      queue.length = 0;
    }
  };
  const iv = setInterval(flush, 500);
  window.addEventListener('beforeunload', () => { clearInterval(iv); flush(); });
})();
    `,
	});

	// If no explicit 'goto' in steps, navigate once up-front.
	if (!steps.some((s) => s.action === 'goto')) {
		const url = options?.url ?? 'https://example.com';
		await page.goto(url, { waitUntil: 'load' });
	}

	// Run caller steps (may include further navigations — rrweb stays active via addInitScript)
	await runSteps(page, steps, {
		url: options?.url,
		maxSteps: options?.maxSteps ?? 50,
		stepTimeoutMs: options?.stepTimeoutMs ?? 15_000,
		restrictHost: options?.restrictHost ?? null,
	});

	// small tail to capture trailing activity
	await page.waitForTimeout(500);

	await browser.close();

	return new Response(JSON.stringify({ count: events.length, events }), {
		headers: { 'content-type': 'application/json' },
	});
}
