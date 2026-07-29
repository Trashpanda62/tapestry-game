/** Resolve paths against the Obscura tenant prefix without assuming a host. */
const requestedBasePath = process.env.TAPESTRY_BASE_PATH;
if (requestedBasePath && !/^\/s\/[a-z0-9-]+$/.test(requestedBasePath)) {
  throw new Error("TAPESTRY_BASE_PATH must be an Obscura /s/<slug> path.");
}
export const canonicalBasePath = requestedBasePath || "/s/tapestry-acres";

export function normalizeBasePath(basePath = canonicalBasePath) {
  if (typeof basePath !== "string" || !basePath.startsWith("/")) {
    throw new Error("Base path must begin with '/'.");
  }
  return basePath.replace(/\/+$/, "") || "/";
}

export function tenantUrl(pathname = "/", basePath = canonicalBasePath) {
  if (typeof pathname !== "string" || !pathname.startsWith("/")) {
    throw new Error("Route path must begin with '/'.");
  }
  const base = normalizeBasePath(basePath);
  return `${base === "/" ? "" : base}${pathname === "/" ? "/" : pathname}`;
}
