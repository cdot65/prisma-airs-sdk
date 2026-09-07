/** @internal Real Chromium checks of loopback previews or explicitly selected public docs. */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from '../artifacts/browser-verification/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const cli = process.argv.includes('--cli');
const publicSite = process.argv.includes('--public');
const origin = publicSite
  ? 'https://cdot65.github.io'
  : cli
    ? 'http://127.0.0.1:4174'
    : 'http://127.0.0.1:4173';
const base = `${origin}/${cli ? 'prisma-airs-cli' : 'prisma-airs-sdk'}/`;
const directory = fileURLToPath(
  new URL(publicSite ? '../artifacts/docs/public/' : '../artifacts/docs/', import.meta.url),
);
mkdirSync(directory, { recursive: true });
const evidence = JSON.parse(
  readFileSync(
    new URL(
      cli ? '../artifacts/examples/cli-inference.json' : '../artifacts/examples/latest.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
const capturedAt = cli ? evidence.capturedAt : evidence.finishedAt;
const batchEvidence = cli
  ? undefined
  : JSON.parse(
      readFileSync(new URL('../artifacts/examples/gateway-batch.json', import.meta.url), 'utf8'),
    );
const capturedBatchAt = batchEvidence?.capturedAt;
const secretReferenceEvidence = cli
  ? undefined
  : JSON.parse(
      readFileSync(
        new URL('../artifacts/examples/gateway-secret-references.json', import.meta.url),
        'utf8',
      ),
    );
const noSandbox = process.env.DOCS_BROWSER_NO_SANDBOX === '1';
const deploymentEvidence = cli
  ? undefined
  : JSON.parse(
      readFileSync(
        new URL('../artifacts/e2e/gateway-deployment-diagnostics-evidence.json', import.meta.url),
        'utf8',
      ),
    );
const observabilityEvidence = cli
  ? undefined
  : JSON.parse(
      readFileSync(
        new URL('../artifacts/examples/gateway-observability.json', import.meta.url),
        'utf8',
      ),
    );
const analyticsFilterEvidence = cli
  ? undefined
  : JSON.parse(
      readFileSync(
        new URL('../artifacts/examples/gateway-analytics-request-filters.json', import.meta.url),
        'utf8',
      ),
    );
const browser = await puppeteer.launch({
  executablePath: process.env.DOCS_CHROMIUM_EXECUTABLE ?? '/usr/bin/chromium',
  headless: true,
  args: ['--disable-dev-shm-usage', ...(noSandbox ? ['--no-sandbox'] : [])],
  env: Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/^PANW_|SECRET|TOKEN|PASSWORD|API_KEY/.test(key),
    ),
  ),
});
const results = [];
const errors = [];
const blockedRequests = [];
async function check(name, action) {
  try {
    await action();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({
      name,
      status: 'FAIL',
      reason: error instanceof Error ? error.message.slice(0, 200) : 'Unknown error',
    });
  }
  console.log(JSON.stringify(results.at(-1)));
}
try {
  const page = await browser.newPage();
  if (publicSite) await page.setCacheEnabled(false);
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      [new URL(base).origin, 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(
        url.origin,
      ) ||
      ['data:', 'blob:'].includes(url.protocol)
    )
      void request.continue();
    else {
      blockedRequests.push(url.origin);
      void request.abort();
    }
  });
  await page.setViewport({ width: 1440, height: 1000 });
  async function assertCapturedJson(expected) {
    const blocks = await page.$$eval('main pre code', (elements) =>
      elements.map((element) => element.textContent),
    );
    const candidates = blocks.flatMap((block) => {
      try {
        return [JSON.parse(block)];
      } catch {
        return [];
      }
    });
    assert(
      candidates.some((value) => {
        try {
          assert.deepEqual(value, expected);
          return true;
        } catch {
          return false;
        }
      }),
      'The rendered JSON differs from the validated live capture',
    );
  }
  if (cli) {
    for (const [path, required] of [
      ['cli/aigateway/inference', [capturedAt, 'gpt-5.6-terra', 'READY', 'response-id']],
      ['runtime/dlp/profiles', ['500', '501']],
      ['cli/runtime/dlp/profiles', ['not live-verified', '501']],
      ['cli/aigateway/telemetry', ['nullable', '0.20.0']],
      ['cli/aigateway/workflows', ['400', 'AB01']],
    ])
      await check(`cli.desktop.${path}`, async () => {
        const response = await page.goto(base + path, {
          waitUntil: 'networkidle0',
          timeout: 30_000,
        });
        assert.equal(response.status(), 200);
        const text = await page.$eval('main', (element) => element.innerText);
        for (const value of required)
          assert(text.includes(value), `Stale or missing CLI documentation: ${path}`);
        if (path.endsWith('/inference')) {
          await assertCapturedJson(evidence.chat);
          await page.screenshot({ path: `${directory}cli-inference-desktop.png` });
        }
      });
    await check('cli.mobile.inference-and-navigation', async () => {
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      await page.goto(`${base}cli/aigateway/inference`, { waitUntil: 'networkidle0' });
      assert((await page.$eval('main', (element) => element.innerText)).includes(capturedAt));
      await page.screenshot({ path: `${directory}cli-inference-mobile.png` });
      await page.click('button[aria-label="Toggle navigation bar"]');
      await page.waitForFunction(
        () => globalThis.document.querySelector('.navbar-sidebar')?.getBoundingClientRect().x >= -1,
      );
      assert(
        (await page.$eval('.navbar-sidebar', (element) => element.innerText)).includes('Docs'),
      );
    });
  } else {
    await check('desktop.examples.current-capture', async () => {
      const response = await page.goto(`${base}guides/examples`, {
        waitUntil: 'networkidle0',
        timeout: 30_000,
      });
      assert.equal(response.status(), 200);
      const text = await page.$eval('main', (element) => element.innerText);
      assert(text.includes(evidence.finishedAt), 'Rendered example timestamp is stale');
      assert(text.includes(`${evidence.output.length} documentation scripts were executed`));
      const pricing = evidence.output.find((item) => item.script === 'gateway-model-pricing');
      assert(pricing && pricing.exitCode === 0 && pricing.stdout);
      await assertCapturedJson(JSON.parse(pricing.stdout));
      const oauth = evidence.output.find((item) => item.script === 'mgmt-auth');
      assert(oauth && oauth.exitCode === 0 && oauth.stdout);
      // Docusaurus renders each source line as a block with a trailing <br>.
      // innerText therefore doubles line breaks; compare source lines exactly.
      const capturedTextBlocks = await page.$$eval('main pre code', (elements) =>
        elements.map((element) =>
          Array.from(
            element.querySelectorAll(':scope > .token-line'),
            (line) => line.textContent,
          ).join('\n'),
        ),
      );
      assert(
        capturedTextBlocks.includes(oauth.stdout.replace(/\n$/, '')),
        'Rendered live OAuth lifecycle output is stale',
      );
      for (const result of evidence.output.filter((item) => item.exitCode && item.statusCode))
        assert(
          text.includes(`HTTP ${result.statusCode}`),
          'A live failure is missing from the page',
        );
      assert(text.includes('gpt-5.6-terra') && text.includes('32'));
      assert(text.includes(capturedBatchAt) && text.includes('Validated batch inference output'));
      await assertCapturedJson(batchEvidence.output);
      assert(
        text.includes(secretReferenceEvidence.capturedAt),
        'Secret-reference timestamp is stale',
      );
      await assertCapturedJson(secretReferenceEvidence.output);
      assert(
        text.includes(observabilityEvidence.capturedAt),
        'Runtime observability timestamp is stale',
      );
      await assertCapturedJson(observabilityEvidence.outputs);
      assert(
        text.includes(analyticsFilterEvidence.capturedAt),
        'Request-chart filter timestamp is stale',
      );
      await assertCapturedJson(analyticsFilterEvidence.output);
      const runtimeDiagnostics = JSON.parse(
        readFileSync(
          new URL('../artifacts/examples/gateway-runtime-diagnostics.json', import.meta.url),
          'utf8',
        ),
      );
      await assertCapturedJson(runtimeDiagnostics);
      assert(text.includes('inference.getLog()') && text.includes('inference.updateFeedback()'));
      assert(
        text.includes(deploymentEvidence.checkedAt),
        'Deployment diagnostic timestamp is stale',
      );
      assert(
        text.includes(deploymentEvidence.bundleSha256),
        'Deployment source fingerprint is stale',
      );
      for (const field of ['analyticsStore', 'logStore', 'feedbackReadError', 'logReadError'])
        assert(
          text.includes(deploymentEvidence.observations[0][field]),
          'A deployed storage finding is missing',
        );
      assert.equal(
        await page.$$eval('main table tbody tr', (rows) => rows.length),
        evidence.output.length,
      );
      await page.screenshot({ path: `${directory}examples-desktop.png` });
    });
    await check('desktop.client-navigation.scan-output', async () => {
      const selector = 'main a[href$="/guides/scan-api#example-output"]';
      await Promise.all([
        page.waitForFunction(() => globalThis.location.pathname.endsWith('/guides/scan-api')),
        page.click(selector),
      ]);
      // A client-side router updates the URL before React commits the new page.
      // Wait for the destination heading, then validate its actual captured output.
      await page.waitForFunction(
        () => globalThis.document.querySelector('main h1')?.textContent === 'Scan API',
      );
      const text = await page.$eval('main', (element) => element.innerText);
      assert(text.includes(evidence.finishedAt));
      assert(text.includes('prompt_masked_data') && text.includes('pattern_detections'));
    });
    await check('desktop.oauth.expand-full-transcript', async () => {
      await page.goto(`${base}guides/oauth-lifecycle`, { waitUntil: 'networkidle0' });
      assert(
        (await page.$eval('main', (element) => element.innerText)).includes(evidence.finishedAt),
      );
      await page.click('main details summary');
      assert(await page.$eval('main details', (element) => element.open));
      await page.waitForFunction(() =>
        globalThis.document.querySelector('main details')?.innerText.includes('ALL PASSED'),
      );
    });
    await check('mobile.examples-and-navigation', async () => {
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      await page.goto(`${base}guides/examples`, { waitUntil: 'networkidle0' });
      assert(
        (await page.$eval('main', (element) => element.innerText)).includes(evidence.finishedAt),
      );
      await page.screenshot({ path: `${directory}examples-mobile.png` });
      await page.click('button[aria-label="Toggle navigation bar"]');
      await page.waitForFunction(
        () => globalThis.document.querySelector('.navbar-sidebar')?.getBoundingClientRect().x >= -1,
      );
      assert(
        (await page.$eval('.navbar-sidebar', (element) => element.innerText)).includes('Docs'),
      );
    });
  }
  if (publicSite) {
    if (!cli) {
      await check('public.published-package-examples.current-capture', async () => {
        const releaseEvidence = JSON.parse(
          readFileSync(
            new URL('../artifacts/examples/cli-inference.json', import.meta.url),
            'utf8',
          ),
        );
        const response = await page.goto(`${base}guides/release-verification`, {
          waitUntil: 'networkidle0',
          timeout: 30_000,
        });
        assert.equal(response.status(), 200);
        const text = await page.$eval('main', (element) => element.innerText);
        for (const value of [releaseEvidence.capturedAt, '10/10', '8/8', '137/242 (56.61%)'])
          assert(text.includes(value), 'Published-package evidence is stale or incomplete');
        await assertCapturedJson(releaseEvidence.chat);
        const usageEvidence = JSON.parse(
          readFileSync(
            new URL('../artifacts/e2e/gateway-usage-reset-observations.json', import.meta.url),
            'utf8',
          ),
        );
        assert.equal(usageEvidence.passed, true);
        assert(text.includes(usageEvidence.finishedAt), 'Usage-reset capture is stale');
        await assertCapturedJson({
          counterBefore: usageEvidence.counterBefore,
          counterAfter: usageEvidence.counterAfter,
        });
        await page.screenshot({ path: `${directory}published-package-examples.png` });
      });
    }
    await check('public.release-notes.version', async () => {
      const version = JSON.parse(
        readFileSync(
          new URL(cli ? '../../prisma-airs-cli/package.json' : '../package.json', import.meta.url),
          'utf8',
        ),
      ).version;
      const response = await page.goto(`${base}about/release-notes`, {
        waitUntil: 'networkidle0',
        timeout: 30_000,
      });
      assert.equal(response.status(), 200);
      assert((await page.$eval('main', (element) => element.innerText)).includes(`v${version}`));
    });
  }
  await check('browser.no-uncaught-javascript-errors', async () => assert.equal(errors.length, 0));
  await check('browser.no-unexpected-external-requests', async () =>
    assert.equal(blockedRequests.length, 0),
  );
} finally {
  const version = await browser.version();
  await browser.close();
  const report = {
    checkedAt: new Date().toISOString(),
    baseUrl: base,
    browser: version,
    browserInteractionVerified: true,
    sandboxDisabled: noSandbox,
    isolation: `Only ${publicSite ? 'public GitHub Pages' : 'loopback'} documentation, its configured Google Fonts assets, and data/blob URLs allowed; no live credentials loaded.`,
    capturedExampleTimestamp: capturedAt,
    capturedBatchTimestamp: capturedBatchAt,
    capturedSecretReferenceTimestamp: secretReferenceEvidence?.capturedAt,
    capturedObservabilityTimestamp: observabilityEvidence?.capturedAt,
    capturedAnalyticsFilterTimestamp: analyticsFilterEvidence?.capturedAt,
    capturedDeploymentTimestamp: deploymentEvidence?.checkedAt,
    deploymentBundleSha256: deploymentEvidence?.bundleSha256,
    capturedRuntimeDiagnosticTimestamps: cli
      ? undefined
      : JSON.parse(
          readFileSync(
            new URL('../artifacts/examples/gateway-runtime-diagnostics.json', import.meta.url),
            'utf8',
          ),
        ).map((report) => report.finishedAt),
    passed: results.every((result) => result.status === 'PASS'),
    results,
    uncaughtErrorCount: errors.length,
    blockedExternalRequestCount: blockedRequests.length,
  };
  writeFileSync(
    `${directory}${cli ? 'cli-browser' : 'browser'}.json`,
    JSON.stringify(report, null, 2) + '\n',
  );
  if (!report.passed) process.exitCode = 1;
}
