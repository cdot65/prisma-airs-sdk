/** @internal Red Team live read/CRUD/CSV workflows; --scan runs a bounded custom job on an existing validated target. */
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
import { RedTeamClient, type TargetCreateRequest } from '../src/index.js';

const credentials = loadLiveCredentials();
const h = new LiveHarness();
const rt = new RedTeamClient({ numRetries: 0 });
const tag = `sdk-e2e-${randomUUID().slice(0, 8)}`;
try {
  await h.check('languages.data', () => rt.getLanguages());
  await h.check('languages.management', () => rt.getManagementLanguages());
  await h.check('metadata.scan', () => rt.getScanMetadata());
  await h.check('metadata.target', () => rt.targets.getTargetMetadata());
  await h.check('metadata.templates', () => rt.targets.getTargetTemplates());
  await h.check('metadata.goals', () => rt.getGoalCategories('APPLICATION'));
  await h.check('metadata.categories', () => rt.scans.getCategories());
  await h.check('dashboard.overview', () => rt.getDashboardOverview());
  await h.check('dashboard.statistics', () => rt.getScanStatistics());
  await h.check('quota', () => rt.getQuota());
  await h.check('eula.content', () => rt.eula.getContent());
  await h.check('eula.status', () => rt.eula.getStatus());
  await h.check('networkBroker.stats', () => rt.networkBroker.getChannelStats());
  const channels = await h.check('networkBroker.list', () =>
    rt.networkBroker.listChannels({ limit: 1 }),
  );
  if (channels?.data[0]?.uuid)
    await h.check('networkBroker.get', () => rt.networkBroker.getChannel(channels.data[0].uuid!));
  const targets = await h.check('targets.list', () => rt.targets.list({ limit: 100 }));
  const target = targets?.data?.find((t) => t.validated && t.active);
  if (target) {
    await h.check('targets.get', () => rt.targets.get(target.uuid));
    await h.check('targets.getProfile', () => rt.targets.getProfile(target.uuid));
    await h.check('dashboard.scoreTrend', () =>
      rt.getScoreTrend(target.uuid, { date_range: 'LAST_7_DAYS' }),
    );
  }
  const jobs = await h.check('scans.list', () => rt.scans.list({ limit: 100 }));
  for (const type of ['STATIC', 'DYNAMIC', 'CUSTOM']) {
    const job = jobs?.data.find((j) => j.job_type === type && j.status === 'COMPLETED');
    if (!job) {
      h.skip(`reports.${type}`, 'No completed fixture of this type is available.');
      continue;
    }
    await h.check(`scans.get.${type}`, () => rt.scans.get(job.uuid));
    await h.check(`errorLogs.${type}`, () => rt.getErrorLogs(job.uuid, { limit: 1 }));
    if (type === 'STATIC') {
      await h.check('reports.static', () => rt.reports.getStaticReport(job.uuid));
      await h.check('reports.static.remediation', () => rt.reports.getStaticRemediation(job.uuid));
      await h.check('reports.static.runtimePolicy', () =>
        rt.reports.getStaticRuntimePolicy(job.uuid),
      );
      const attacks = await h.check('reports.static.attacks', () =>
        rt.reports.listAttacks(job.uuid, { limit: 1 }),
      );
      if (attacks?.data[0])
        await h.check('reports.static.attackDetail', () =>
          rt.reports.getAttackDetail(job.uuid, attacks.data[0].uuid),
        );
    } else if (type === 'DYNAMIC') {
      await h.check('reports.dynamic', () => rt.reports.getDynamicReport(job.uuid));
      await h.check('reports.dynamic.remediation', () =>
        rt.reports.getDynamicRemediation(job.uuid),
      );
      await h.check('reports.dynamic.runtimePolicy', () =>
        rt.reports.getDynamicRuntimePolicy(job.uuid),
      );
      await h.check('reports.dynamic.goals', () => rt.reports.listGoals(job.uuid, { limit: 1 }));
    } else {
      await h.check('reports.custom', () => rt.customAttackReports.getReport(job.uuid));
      await h.check('reports.custom.promptSets', () =>
        rt.customAttackReports.getPromptSets(job.uuid, { limit: 1 }),
      );
      await h.check('reports.custom.attacks', () =>
        rt.customAttackReports.listCustomAttacks(job.uuid, { limit: 1 }),
      );
      await h.check('reports.custom.propertyStats', () =>
        rt.customAttackReports.getPropertyStats(job.uuid),
      );
    }
  }
  const adapterDefaults = await h.check('adapters.config', () => rt.adapters.getConfig());
  await h.check('adapters.list.filters', () =>
    rt.adapters.list({ limit: 1, status: 'DRAFT', include_target_count: true }),
  );
  await h.check('promptSets.list.filters', () =>
    rt.customAttacks.listPromptSets({ limit: 1, language: 'en' }),
  );
  await h.check('promptSets.active', () => rt.customAttacks.listActivePromptSets());
  await h.check('properties.names', () => rt.customAttacks.getPropertyNames());
  if (process.argv.includes('--writes')) {
    if (adapterDefaults) {
      const adapterBody = {
        name: tag,
        script_b64: adapterDefaults.default_script_b64,
        prompt: 'Say hello.',
        variables: [
          { key: 'test_marker', type: 'SECRET' as const, value: 'synthetic-sdk-test-marker' },
        ],
      };
      const adapter = await h.check('adapters.create.draft', () =>
        rt.adapters.create(adapterBody, { validate: false }),
      );
      if (adapter) {
        h.own('red-team.adapter', adapter.uuid, tag);
        h.defer('adapters.delete', () => rt.adapters.delete(adapter.uuid));
        await h.check('adapters.get', () => rt.adapters.get(adapter.uuid));
        await h.check('adapters.update.draft', () =>
          rt.adapters.update(
            adapter.uuid,
            { ...adapterBody, description: 'Updated disposable fixture' },
            { validate: false },
          ),
        );
      }
    }
    const draftBody: TargetCreateRequest = {
      name: tag,
      target_type: 'APPLICATION',
      connection_type: 'CUSTOM',
      api_endpoint_type: 'PUBLIC',
      response_mode: 'REST',
      connection_params: {
        api_endpoint: 'https://example.invalid/sdk-test',
        request_json: { prompt: '{INPUT}' },
        response_json: { output: '{RESPONSE}' },
        response_key: 'output',
      },
    };
    const draft = await h.check('targets.create.draft', () =>
      rt.targets.create(draftBody, { validate: false }),
    );
    if (draft) {
      h.own('red-team.target', draft.uuid, tag);
      h.defer('targets.delete', () => rt.targets.delete(draft.uuid));
      await h.check('targets.get.draft', () => rt.targets.get(draft.uuid));
      await h.check('targets.update.draft', () =>
        rt.targets.update(
          draft.uuid,
          { ...draftBody, description: 'Updated SDK draft' },
          { validate: false },
        ),
      );
      await h.check('targets.updateProfile.draft', () =>
        rt.targets.updateProfile(draft.uuid, {
          additional_context: { system_prompt: 'Benign disposable SDK fixture.' },
        }),
      );
    }
    const set = await h.check('promptSets.create', () =>
      rt.customAttacks.createPromptSet({
        name: tag,
        description: 'Disposable SDK conformance fixture',
        language: 'en',
      }),
    );
    if (set) {
      h.own('red-team.prompt-set', set.uuid, tag);
      h.defer('promptSets.archive', () =>
        rt.customAttacks.archivePromptSet(set.uuid, { archive: true }),
      );
      await h.check('promptSets.get', () => rt.customAttacks.getPromptSet(set.uuid));
      await h.check('promptSets.update', () =>
        rt.customAttacks.updatePromptSet(set.uuid, {
          description: 'Updated disposable SDK fixture',
        }),
      );
      const prompt = await h.check('prompts.create', () =>
        rt.customAttacks.createPrompt({
          prompt_set_id: set.uuid,
          prompt: 'Reply only with the marker SDK_TEST_OK.',
          goal: 'Make the response contain SDK_TEST_OK.',
        }),
      );
      if (prompt) {
        h.own('red-team.prompt', prompt.uuid, tag);
        h.defer('prompts.delete', () => rt.customAttacks.deletePrompt(set.uuid, prompt.uuid));
        await h.check('prompts.get', () => rt.customAttacks.getPrompt(set.uuid, prompt.uuid));
        await h.check('prompts.update', () =>
          rt.customAttacks.updatePrompt(set.uuid, prompt.uuid, {
            prompt: 'Please reply only with SDK_TEST_OK.',
          }),
        );
      }
      const template = await h.check('prompts.downloadTemplate', () =>
        rt.customAttacks.downloadTemplate(set.uuid),
      );
      if (template) {
        const header = template.split(/\r?\n/)[0];
        const columns = header.split(',').map((c) => c.replaceAll('"', '').trim().toLowerCase());
        const row = columns
          .map((c) =>
            JSON.stringify(
              c.includes('prompt')
                ? 'Reply only SDK_TEST_OK.'
                : c.includes('goal')
                  ? 'Make the response contain SDK_TEST_OK.'
                  : '',
            ),
          )
          .join(',');
        await h.check('prompts.uploadCsv', () =>
          rt.customAttacks.uploadPromptsCsv(
            set.uuid,
            new Blob([header + '\n' + row + '\n'], { type: 'text/csv' }),
          ),
        );
      }
      await h.check('prompts.list', () => rt.customAttacks.listPrompts(set.uuid, { limit: 1 }));
      const reference = await h.check('promptSets.reference', () =>
        rt.customAttacks.getPromptSetReference(set.uuid),
      );
      await h.check('promptSets.versionInfo', () =>
        rt.customAttacks.getPromptSetVersionInfo(set.uuid, {
          version: String(reference?.version ?? 1),
        }),
      );
      if (process.argv.includes('--scan') && target && reference) {
        const job = await h.check('scans.create.custom', () =>
          rt.scans.create({
            name: tag,
            target: { uuid: target.uuid },
            job_type: 'CUSTOM',
            job_metadata: { custom_prompt_sets: [reference.uuid] },
          }),
        );
        if (job) {
          h.own('red-team.scan-audit-record', job.uuid, tag);
          let finished = false;
          h.defer('scans.abort-if-running', async () => {
            if (!finished) await rt.scans.abort(job.uuid);
          });
          await h.check('scans.custom.completes', async () => {
            for (let attempt = 0; attempt < 60; attempt++) {
              const current = await rt.scans.get(job.uuid);
              if (current.status === 'COMPLETED') {
                finished = true;
                return;
              }
              if (current.status && ['FAILED', 'ABORTED'].includes(current.status))
                throw new Error(`Custom scan terminated: ${current.status}`);
              await delay(3000);
            }
            throw new Error('Custom scan exceeded the three-minute polling budget');
          });
          if (finished)
            await h.check('scans.custom.report', () => rt.customAttackReports.getReport(job.uuid));
        }
      } else
        h.skip(
          'scans.custom.lifecycle',
          'Requires --scan and an existing validated target plus an active prompt-set reference.',
        );
    }
  } else
    h.skip('red-team.write-workflows', 'Pass --writes to create and clean up disposable fixtures.');
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  await h.cleanup();
  credentials.verifyUnchanged();
  h.finish('red-team', true);
}
