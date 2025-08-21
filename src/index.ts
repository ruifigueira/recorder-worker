import { Hono } from 'hono';
import { record } from './record';
import { RecordOptions, Step } from './utils/steps';
import { replay } from './replay';
import { appPage } from './app';
const app = new Hono();

app.get('/', (c) => c.text('Hello Cloudflare Workers!'));
app.get('/app', () => appPage());
app.post('/record', async (c) => {
	const body = await c.req.json().catch(() => ({}));
	const steps: Step[] = Array.isArray(body?.steps) ? body.steps : [];
	const options: RecordOptions | undefined = body?.options;

	// Minimal guardrails
	if (!Array.isArray(steps)) return c.json({ error: 'steps must be an array' }, 400);

	try {
		return await record({ steps, options });
	} catch (err: any) {
		return c.json({ error: err?.message ?? 'recording failed' }, 500);
	}
});
app.post('/replay', replay);

export default app;
