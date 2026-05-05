/**
 * CI helper — invokes the api/sitemap.ts handler with mocked
 * VercelRequest/VercelResponse and prints the rendered XML to stdout.
 *
 * Used by .github/workflows/seo-checks.yml (sitemap-diff job).
 *
 * Run with: npx tsx scripts/render-sitemap.mts
 * Optional: pass an alternate handler path as argv[2]
 *           (e.g. for diffing against origin/main checkout).
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

interface MockResponse {
  _data: string;
  setHeader(): this;
  status(): this;
  send(d: string): this;
}

async function main() {
  const handlerPath = process.argv[2] ?? './api/sitemap.ts';
  const absolute = path.resolve(process.cwd(), handlerPath);
  const mod = await import(pathToFileURL(absolute).href);
  const handler = mod.default;
  if (typeof handler !== 'function') {
    throw new Error(`No default export handler in ${handlerPath}`);
  }
  const res: MockResponse = {
    _data: '',
    setHeader() {
      return this;
    },
    status() {
      return this;
    },
    send(d) {
      this._data = d;
      return this;
    },
  };
  await handler({ headers: {}, query: {} }, res);
  process.stdout.write(res._data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
