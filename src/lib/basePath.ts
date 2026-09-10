/**
 * GitHub Pages serves a project site from a subfolder
 * (salome-opny.github.io/budget-app), so every absolute URL the app writes by
 * hand needs this prefix. Next rewrites the ones it controls itself — <Link>
 * hrefs, bundle URLs — from the matching `basePath` in next.config.ts.
 *
 * Empty in local development, so `npm run dev` still serves from the root.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix an app-absolute path, e.g. `withBase("/sw.js")`. */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
