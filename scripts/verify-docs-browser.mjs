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
      cli ? '../artifacts/examples/cli-inference-v4.4.0.json' : '../artifacts/examples/latest.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
const capturedAt = cli ? evidence.capturedAt : evidence.finishedAt;
const nativeEvidence = JSON.parse(
  readFileSync(
    new URL(
      cli ? '../artifacts/cli440-dlp-registry.json' : '../artifacts/cli431-dlp-registry.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
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
const analyticsChartEvidence = cli
  ? undefined
  : JSON.parse(
      readFileSync(
        new URL('../artifacts/examples/gateway-analytics-chart-filters-sdk.json', import.meta.url),
        'utf8',
      ),
    );
const analyticsQueryEvidence = cli
  ? undefined
  : JSON.parse(
      readFileSync(
        new URL(
          '../artifacts/examples/gateway-analytics-query-contracts-sdk.json',
          import.meta.url,
        ),
        'utf8',
      ),
    );
const analyticsGroupEvidence = cli
  ? undefined
  : JSON.parse(
      readFileSync(
        new URL('../artifacts/examples/gateway-analytics-group-filters-sdk.json', import.meta.url),
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
      [
        'runtime/dlp/generate',
        [nativeEvidence.generatedAt, '4.4.0', '11/11', '26 file signatures', 'sharp'],
      ],
      [
        'cli/runtime/dlp/generate',
        [nativeEvidence.generatedAt, '4.4.0', '11/11', 'instead of JSON', 'sharp'],
      ],
      ['cli/aigateway/telemetry', ['null', '0.25.0', '4.4.0', '103/103', '--cost-max']],
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
        if (path === 'cli/runtime/dlp/generate') await assertCapturedJson(nativeEvidence.summary);
        if (path.endsWith('/inference')) {
          await assertCapturedJson(evidence.chat);
          await page.screenshot({ path: `${directory}cli-inference-desktop.png` });
        }
        if (path.endsWith('/telemetry')) {
          const empty = JSON.parse(
            readFileSync(
              new URL('../artifacts/examples/cli-analytics-v4.4.0.json', import.meta.url),
              'utf8',
            ),
          );
          assert(text.includes(empty.capturedAt), 'Empty latency capture is stale');
          await assertCapturedJson(empty.output);
          const filters = JSON.parse(
            readFileSync(
              new URL(
                '../artifacts/examples/gateway-analytics-query-contracts-cli-v4.4.0.json',
                import.meta.url,
              ),
              'utf8',
            ),
          );
          assert(text.includes(filters.capturedAt), 'Chart-filter capture is stale');
          assert(text.includes(filters.cliVersion) && text.includes(filters.sdkVersion));
          await assertCapturedJson(filters.evidence);
          const groups = JSON.parse(
            readFileSync(
              new URL(
                '../artifacts/examples/gateway-analytics-group-filters-cli-v4.4.0.json',
                import.meta.url,
              ),
              'utf8',
            ),
          );
          assert.equal(groups.mode, 'installed-cli');
          assert.deepEqual(groups.suite, { passed: 103, failed: 0, total: 103 });
          assert.equal(groups.evidence.length, 101);
          assert(text.includes(groups.capturedAt), 'Grouped-filter capture is stale');
          await assertCapturedJson(groups.evidence);
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
      assert(
        text.includes(analyticsChartEvidence.capturedAt),
        'Multi-chart filter timestamp is stale',
      );
      assert(text.includes(analyticsChartEvidence.sdkVersion), 'Analytics SDK version is stale');
      assert(
        text.includes(analyticsChartEvidence.mode),
        'Analytics source/installed provenance is stale',
      );
      await assertCapturedJson(analyticsChartEvidence.evidence);
      assert(text.includes(analyticsQueryEvidence.capturedAt), 'Analytics query capture is stale');
      assert(
        text.includes(analyticsQueryEvidence.sdkVersion),
        'Analytics query SDK version is stale',
      );
      assert(
        text.includes(analyticsQueryEvidence.mode),
        'Analytics query installation mode is absent',
      );
      await assertCapturedJson(analyticsQueryEvidence.evidence);
      const administration = JSON.parse(
        readFileSync(
          new URL(
            '../artifacts/e2e/gateway-administration-availability-observations.json',
            import.meta.url,
          ),
          'utf8',
        ),
      );
      const administrationSuite = JSON.parse(
        readFileSync(
          new URL('../artifacts/e2e/gateway-administration-availability.json', import.meta.url),
          'utf8',
        ),
      );
      assert(
        text.includes(administrationSuite.finishedAt),
        'Administration availability capture is stale',
      );
      assert(text.includes('all 24 route probes failed with OPA-denied HTTP 403'));
      await assertCapturedJson(administration.rows);
      const metadata = JSON.parse(
        readFileSync(
          new URL('../artifacts/e2e/gateway-mcp-metadata-observations.json', import.meta.url),
          'utf8',
        ),
      );
      assert.equal(metadata.passed, false);
      assert(text.includes(metadata.finishedAt), 'MCP metadata capture is stale');
      assert(text.includes('18 pass / 2 fail / 0 skip'), 'MCP metadata failures are missing');
      const metadataSuite = JSON.parse(
        readFileSync(
          new URL('../artifacts/e2e/gateway-mcp-metadata.json', import.meta.url),
          'utf8',
        ),
      );
      const metadataAudit = JSON.parse(
        readFileSync(
          new URL('../artifacts/e2e/gateway-mcp-fixture-audit.json', import.meta.url),
          'utf8',
        ),
      );
      const metadataRuntime = JSON.parse(
        readFileSync(
          new URL('../artifacts/e2e/gateway-mcp-runtime-diagnostics.json', import.meta.url),
          'utf8',
        ),
      );
      // The page renders one complete envelope, not separate discovery/variant blocks.
      // Compare that exact envelope independently, including failures and cleanup evidence.
      await assertCapturedJson({
        finishedAt: metadataSuite.finishedAt,
        passed: metadataSuite.passed,
        failed: metadataSuite.failed,
        skipped: metadataSuite.skipped,
        credentialsUnchanged: metadataSuite.credentialsUnchanged,
        anonymousPreflight: {
          finishedAt: metadata.preflight.finishedAt,
          prompt: metadata.preflight.prompt,
          resource: metadata.preflight.resource,
          resource_template: metadata.preflight.resource_template,
          sessionTerminationStatus: metadata.preflight.sessionTerminationStatus,
          sessionRetirement: metadata.preflight.sessionRetirement,
        },
        discovery: metadata.discovery,
        selectedKinds: metadata.selectedKinds,
        variants: metadata.variants,
        toolsInvoked: metadata.toolsInvoked,
        promptsRetrieved: metadata.promptsRetrieved,
        resourcesRead: metadata.resourcesRead,
        independentFixtureAudit: {
          finishedAt: metadataAudit.finishedAt,
          passed: metadataAudit.passed,
          failed: metadataAudit.failed,
        },
        runtimeDiagnosis: metadataRuntime,
      });
      assert(
        text.includes(analyticsGroupEvidence.capturedAt),
        'Grouped analytics capture is stale',
      );
      assert(
        text.includes(analyticsGroupEvidence.sdkVersion),
        'Grouped analytics SDK version is stale',
      );
      assert(
        text.includes(analyticsGroupEvidence.mode),
        'Grouped analytics installed provenance is absent',
      );
      assert(text.includes('102/102'), 'Grouped analytics result count is absent');
      await assertCapturedJson(analyticsGroupEvidence.evidence);
      const runtimeDiagnostics = JSON.parse(
        readFileSync(
          new URL('../artifacts/examples/gateway-runtime-diagnostics.json', import.meta.url),
          'utf8',
        ),
      );
      await assertCapturedJson(runtimeDiagnostics);
      const realtimeExample = JSON.parse(
        readFileSync(
          new URL('../artifacts/examples/gateway-realtime.json', import.meta.url),
          'utf8',
        ),
      );
      await assertCapturedJson(realtimeExample);
      assert(
        text.includes(realtimeExample.finishedAt) && text.includes('inference.connectRealtime()'),
      );
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
        const registry = JSON.parse(
          readFileSync(
            new URL('../artifacts/package/registry-v0.25.0.json', import.meta.url),
            'utf8',
          ),
        );
        const registryInference = JSON.parse(
          readFileSync(
            new URL('../artifacts/e2e/release-sdk-inference-v0.25.0.json', import.meta.url),
            'utf8',
          ),
        );
        const registryCharts = JSON.parse(
          readFileSync(
            new URL(
              '../artifacts/e2e/gateway-analytics-query-contracts-sdk-v0.25.0.json',
              import.meta.url,
            ),
            'utf8',
          ),
        );
        assert.equal(registry.passed, true);
        assert.equal(registryInference.failed, 0);
        assert.equal(registryCharts.failed, 0);
        for (const value of [
          registry.checkedAt,
          registry.payloadCheckedAt,
          registry.sha256,
          registryInference.finishedAt,
          registryCharts.finishedAt,
          analyticsGroupEvidence.capturedAt,
          '102/102',
          '53/53',
          'SDK 0.25.0 registry verification',
        ]) {
          assert(text.includes(value), 'Latest SDK registry evidence is stale or incomplete');
        }
        for (const value of [releaseEvidence.capturedAt, '10/10', '8/8', '138/242 (57.02%)'])
          assert(text.includes(value), 'Published-package evidence is stale or incomplete');
        await assertCapturedJson(releaseEvidence.chat);
        const empty = JSON.parse(
          readFileSync(
            new URL('../artifacts/examples/cli-analytics.json', import.meta.url),
            'utf8',
          ),
        );
        assert(text.includes(empty.capturedAt), 'Registry CLI analytics capture is stale');
        await assertCapturedJson(empty.output);
        assert(text.includes(nativeEvidence.generatedAt), 'Registry native CLI capture is stale');
        await assertCapturedJson(nativeEvidence.summary);
        const latestCli = (path) =>
          JSON.parse(readFileSync(new URL(`../artifacts/${path}`, import.meta.url), 'utf8'));
        const cliChat = latestCli('examples/cli-inference-v4.4.0.json');
        const cliEmpty = latestCli('examples/cli-analytics-v4.4.0.json');
        const cliNative = latestCli('cli440-dlp-registry.json');
        const cliRegistry = latestCli('package/registry-cli-v4.4.0.json');
        const cliContainer = latestCli('cli440-container-verification.json');
        for (const value of [
          'CLI 4.4.0 registry and container verification',
          cliChat.capturedAt,
          cliEmpty.capturedAt,
          cliNative.generatedAt,
          cliRegistry.checkedAt,
          cliRegistry.sha256,
          cliContainer.digest,
          latestCli('e2e/gateway-analytics-group-filters-cli-v4.4.0.json').finishedAt,
          latestCli('e2e/gateway-analytics-query-contracts-cli-v4.4.0.json').finishedAt,
          '103/103',
          '54/54',
        ])
          assert(text.includes(value), 'Latest CLI registry evidence is stale or incomplete');
        await assertCapturedJson(cliChat.chat);
        await assertCapturedJson(cliEmpty.output);
        await assertCapturedJson(cliNative.summary);
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
        const mcpEvidence = JSON.parse(
          readFileSync(
            new URL('../artifacts/e2e/gateway-mcp-discovery-observations.json', import.meta.url),
            'utf8',
          ),
        );
        assert(text.includes(mcpEvidence.finishedAt), 'MCP discovery capture is stale');
        assert.equal(mcpEvidence.passed, false);
        await assertCapturedJson({
          initializeStatus: mcpEvidence.http.find((item) => item.rpcMethods.includes('initialize'))
            ?.status,
          capabilitiesBefore: mcpEvidence.capabilitiesBefore,
          toolsInvoked: mcpEvidence.toolsInvoked,
          sessionIssued: mcpEvidence.sessionIssued,
        });
        const publicMcp = JSON.parse(
          readFileSync(
            new URL('../artifacts/e2e/gateway-mcp-public-observations.json', import.meta.url),
            'utf8',
          ),
        );
        assert.equal(publicMcp.passed, true);
        assert(text.includes(publicMcp.finishedAt), 'Public MCP lifecycle capture is stale');
        await assertCapturedJson({
          capabilitiesBefore: publicMcp.capabilitiesBefore,
          capabilitiesAfter: publicMcp.capabilitiesAfter,
          capabilityStates: publicMcp.capabilityStates,
          runtimeToolCounts: publicMcp.runtimeToolCounts,
          runtimeCapabilityStates: publicMcp.runtimeCapabilityStates,
          toolsInvoked: publicMcp.toolsInvoked,
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
