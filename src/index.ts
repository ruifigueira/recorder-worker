import { Hono } from 'hono';
import { record } from './record';
import { RecordOptions, Step } from './utils/steps';
import { replay } from './replay';
const app = new Hono();

app.post('/record', async (c) => {
	const { steps, options } = await c.req.json() as { steps: Step[]; options?: RecordOptions };

	// Minimal guardrails
	if (!Array.isArray(steps))
		return c.json({ error: 'steps must be an array' }, 400);

	try {
		return await record({ steps, options });
	} catch (err: any) {
		return c.json({ error: err?.message ?? 'recording failed' }, 500);
	}
});
app.post('/replay', replay);

export default app;
