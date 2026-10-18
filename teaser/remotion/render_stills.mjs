// Frame-by-frame master render via renderStill (fresh page per frame).
// `remotion render` silently dropped 3D layers / returned black <OffthreadVideo> frames on ~5–17% of frames
// for the promo comps (see out/master/verified.log); renderStill has matched on every frame checked.
//
// usage: node render_stills.mjs <CompositionId> <outDir> [from] [to] [workers]
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [comp, outDir, fromArg, toArg, workersArg] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", {
  browserExecutable: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  chromiumOptions: { gl: "swiftshader" },
});
const composition = await selectComposition({ serveUrl, id: comp, puppeteerInstance: browser });
const from = fromArg ? Number(fromArg) : 0;
const to = toArg ? Number(toArg) : composition.durationInFrames - 1;
const workers = workersArg ? Number(workersArg) : 2;

const frames = [];
for (let f = from; f <= to; f++) {
  const out = path.join(outDir, `f${String(f).padStart(4, "0")}.png`);
  if (!fs.existsSync(out)) frames.push([f, out]);
}
const t0 = Date.now();
let done = 0;
const worker = async () => {
  while (frames.length) {
    const [f, out] = frames.shift();
    await renderStill({ composition, serveUrl, frame: f, output: out, puppeteerInstance: browser, imageFormat: "png", timeoutInMilliseconds: 120000 });
    done++;
    if (done % 25 === 0) console.log(`${comp} ${done} frames, ${((Date.now() - t0) / done / 1000).toFixed(2)} s/frame`);
  }
};
await Promise.all(Array.from({ length: workers }, worker));
await browser.close({ silent: true });
console.log(`${comp} done ${done} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
