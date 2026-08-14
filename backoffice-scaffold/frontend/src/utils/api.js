export function buildApiUrl(path) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl}${path}`;
}
