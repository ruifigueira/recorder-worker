import { Stagehand } from "@cloudflare/stagehand";

export type StructuredStep =
	| { action: 'goto'; url: string; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }
	| { action: 'click'; selector: string }
	| { action: 'fill'; selector: string; value: string }
	| { action: 'type'; selector: string; text: string; delay?: number }
	| { action: 'press'; selector: string; key: string }
	| { action: 'check' | 'uncheck'; selector: string }
	| { action: 'selectOption'; selector: string; value: string | string[] }
	| { action: 'mouseMove'; x: number; y: number }
	| { action: 'hover'; selector: string }
	| { action: 'waitForSelector'; selector: string; state?: 'attached' | 'detached' | 'visible' | 'hidden' }
	| { action: 'wait'; ms: number };
export type Step = 
	| StructuredStep
	| string;

export interface RecordOptions {
	url?: string; // default target if no 'goto' step is provided
	maxSteps?: number; // default 50
	stepTimeoutMs?: number; // default 15_000
	restrictHost?: string | null; // e.g. "example.com" to forbid navigating elsewhere
}

export async function runSteps(stagehand: Stagehand, steps: Step[], opts: RecordOptions) {
	const maxSteps = opts.maxSteps ?? 50;
	if (steps.length > maxSteps) throw new Error(`Too many steps: ${steps.length} > ${maxSteps}`);
	const { page } = stagehand;

	page.setDefaultTimeout(opts.stepTimeoutMs ?? 15_000);

	for (const [i, s] of steps.entries()) {
		if (typeof s === 'string') {
			await page.act(s);
			continue;
		}

		switch (s.action) {
			case 'goto': {
				if (opts.restrictHost) {
					const host = new URL(s.url).host;
					if (host !== opts.restrictHost) throw new Error(`Step ${i}: navigation to ${host} not allowed`);
				}
				await page.goto(s.url, { waitUntil: s.waitUntil ?? 'load' });
				break;
			}
			case 'click':
				await page.click(s.selector);
				break;
			case 'fill':
				await page.fill(s.selector, s.value);
				break;
			case 'type':
				await page.type(s.selector, s.text, s.delay ? { delay: s.delay } : undefined);
				break;
			case 'press':
				await page.press(s.selector, s.key);
				break;
			case 'check':
				await page.check(s.selector);
				break;
			case 'uncheck':
				await page.uncheck(s.selector);
				break;
			case 'selectOption':
				await page.selectOption(s.selector, Array.isArray(s.value) ? s.value : { value: s.value });
				break;
			case 'mouseMove':
				await page.mouse.move(s.x, s.y);
				break;
			case 'hover':
				await page.hover(s.selector);
				break;
			case 'waitForSelector':
				await page.waitForSelector(s.selector, { state: s.state ?? 'visible' });
				break;
			case 'wait':
				await page.waitForTimeout(s.ms);
				break;
			default:
				throw new Error(`Unsupported action in step ${i}`);
		}
	}
}
