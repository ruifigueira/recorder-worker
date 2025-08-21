// replay.ts
// Hono handler that accepts { events, options } and returns an HTML rrweb-player page.

type ReplayOptions = {
	width?: number;
	height?: number;
	autoPlay?: boolean;
	speed?: number;
	mouseTail?: boolean;
	showController?: boolean;
};

function renderReplayHtml(
	events: unknown[],
	{ width = 1100, height = 700, autoPlay = true, speed = 1, mouseTail = false, showController = true }: ReplayOptions = {}
): string {
	// Avoid inline-script breakouts
	const eventsJson = JSON.stringify(events).replace(/</g, '\\u003c');

	// Pin versions for reproducibility
	const PLAYER_CSS = 'https://cdn.jsdelivr.net/npm/rrweb-player@1.0.5/dist/style.css';
	const PLAYER_JS = 'https://cdn.jsdelivr.net/npm/rrweb-player@1.0.5/dist/index.js';

	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self' https:; script-src 'self' https: 'unsafe-inline'; style-src 'self' https: 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; base-uri 'none'; frame-ancestors 'none';"
    >
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>rrweb replay</title>
    <link rel="stylesheet" href="${PLAYER_CSS}" />
    <style>
      html, body { margin: 0; height: 100%; background: #0b0c0e; }
      #wrap { display: flex; align-items: center; justify-content: center; height: 100%; }
      #player { box-shadow: 0 10px 30px rgba(0,0,0,.4); border-radius: 12px; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="wrap"><div id="player"></div></div>

    <script id="events-json" type="application/json">${eventsJson}</script>
    <script src="${PLAYER_JS}"></script>
    <script>
      (function () {
        const raw = document.getElementById('events-json').textContent;
        const events = JSON.parse(raw);
        new rrwebPlayer({
          target: document.getElementById('player'),
          props: {
            events,
            width: ${Number(width)},
            height: ${Number(height)},
            autoPlay: ${autoPlay ? 'true' : 'false'},
            speed: ${Number(speed)},
            mouseTail: ${mouseTail ? 'true' : 'false'},
            showController: ${showController ? 'true' : 'false'}
          }
        });
      })();
    </script>
  </body>
</html>`;
}

export async function replay(c: any): Promise<Response> {
	const body = await c.req.json().catch(() => null);
	const events = body?.events;
	const options: ReplayOptions = body?.options ?? {};

	if (!Array.isArray(events)) {
		return c.json({ error: 'events must be an array' }, 400);
	}
	if (events.length > 200_000) {
		return c.json({ error: 'too many events; cap at 200k for this endpoint' }, 413);
	}

	const html = renderReplayHtml(events, options);
	return new Response(html, {
		headers: { 'content-type': 'text/html; charset=utf-8' },
	});
}
