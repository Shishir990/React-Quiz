// A response body as JSON, or {} when it is empty or not JSON
// (e.g. an HTML error page from a proxy), so callers can always read .message
export async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}
