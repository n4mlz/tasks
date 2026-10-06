/** Keep post-redirect-get navigation on the browser-visible origin behind reverse proxies. */
export function redirectAfterPost(path: "/" | "/inbox" | "/week"): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: path },
  });
}
