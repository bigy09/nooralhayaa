// Minimal adapter: convert Express-like handler to Cloudflare Worker fetch handler
export function createWorkerFromExpress(appHandler) {
  return async function (request, env, ctx) {
    // Build a minimal Node-like req/res for handlers that only use basic properties
    const url = new URL(request.url);

    const req = {
      method: request.method,
      url: request.url,
      path: url.pathname + url.search,
      headers: Object.fromEntries(request.headers),
      query: Object.fromEntries(url.searchParams),
      body: null,
      params: {},
    };

    try {
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const ct = request.headers.get('content-type') || '';
        if (ct.includes('application/json')) req.body = await request.json();
        else req.body = await request.text();
      }
    } catch (_e) {
      req.body = null;
    }

    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      status(code) {
        this.statusCode = code; return this;
      },
      json(obj) {
        this.headers['Content-Type'] = 'application/json';
        this.body = JSON.stringify(obj); return this;
      },
      send(text) { this.body = String(text); return this; },
      set(name, value) { this.headers[name] = String(value); return this; },
    };

    // Call the provided appHandler(req, res)
    await appHandler(req, res, env);

    return new Response(res.body || '', { status: res.statusCode, headers: res.headers });
  };
}
