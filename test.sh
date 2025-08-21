curl -X POST http://localhost:8787/record \
  -H 'content-type: application/json' \
  -d '{
    "options": { "url": "https://demoto.xyz", "restrictHost": "example.com" },
    "steps": [
      { "action": "waitForSelector", "selector": "text=Demoto.xyz" },
      { "action": "click", "selector": "text=Demoto.xyz" },
      { "action": "wait", "ms": 1000 }
    ]
  }'