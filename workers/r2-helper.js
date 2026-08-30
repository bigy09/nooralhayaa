// Helper utilities for Cloudflare Workers to interact with R2
export async function uploadToR2(binding, key, body, contentType = 'application/octet-stream') {
  // binding is the R2 binding name (env.UPLOADS)
  return await binding.put(key, body, { httpMetadata: { contentType } });
}

export async function getFromR2(binding, key) {
  const obj = await binding.get(key);
  if (!obj) return null;
  const arrayBuffer = await obj.arrayBuffer();
  return new Response(arrayBuffer, { status: 200, headers: { 'Content-Type': obj.httpMetadata.contentType || 'application/octet-stream' } });
}

export async function deleteFromR2(binding, key) {
  await binding.delete(key);
}
