/** @internal Model Security CRUD, policy evaluation registration, history and pagination. */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
import { ModelSecurityClient, ModelSecurityRuleInstanceUpdateRequestSchema } from '../src/index.js';

const credentials = loadLiveCredentials();
const h = new LiveHarness();
const client = new ModelSecurityClient({ numRetries: 0 });
const tag = `sdk-e2e-${randomUUID().slice(0, 8)}`;
try {
  await h.check('scans.listAll.cap', async () =>
    assert((await client.scans.listAll({ max: 2, limit: 1 })).length <= 2),
  );
  await h.check('customRules.listAll.cap', async () =>
    assert((await client.customRules.listAll({ max: 2, limit: 1 })).length <= 2),
  );
  const rules = await h.check('securityRules.list', () => client.securityRules.list({ limit: 1 }));
  if (rules?.rules[0])
    await h.check('securityRules.get', () => client.securityRules.get(rules.rules[0].uuid));
  const history = await h.check('securityRules.listVersions', () =>
    client.securityRules.listVersions({ limit: 1 }),
  );
  if (history?.versions[0])
    await h.check('securityRules.history', () =>
      client.securityRules.list({ generation: history.versions[0].generation }),
    );
  const customHistory = await h.check('customRules.listVersions', () =>
    client.customRules.listVersions({ limit: 1 }),
  );
  if (customHistory?.versions[0])
    await h.check('customRules.history', () =>
      client.customRules.list({ generation: customHistory.versions[0].generation }),
    );
  const models = await h.check('models.list', () => client.models.listModels({ limit: 1 }));
  if (models?.models[0]) {
    const id = models.models[0].uuid;
    await h.check('models.get', () => client.models.getModel(id));
    const versions = await h.check('models.listVersions', () =>
      client.models.listModelVersions(id, { limit: 1 }),
    );
    if (versions?.model_versions[0]) {
      await h.check('models.getVersion', () =>
        client.models.getModelVersion(versions.model_versions[0].uuid),
      );
      await h.check('models.listFiles', () =>
        client.models.listModelVersionFiles(versions.model_versions[0].uuid, { limit: 1 }),
      );
    }
  }
  if (process.argv.includes('--writes')) {
    const group = await h.check('securityGroups.create', () =>
      client.securityGroups.create({
        name: tag,
        source_type: 'LOCAL',
        description: 'Disposable SDK conformance fixture',
      }),
    );
    if (group) {
      h.own('model-security.group', group.uuid, tag);
      h.defer('securityGroups.delete', () => client.securityGroups.delete(group.uuid));
      await h.check('securityGroups.get', () => client.securityGroups.get(group.uuid));
      await h.check('securityGroups.update', async () =>
        assert.equal(
          (
            await client.securityGroups.update(group.uuid, {
              description: 'Updated disposable SDK fixture',
            })
          ).description,
          'Updated disposable SDK fixture',
        ),
      );
      const instances = await h.check('securityGroups.listRuleInstances', () =>
        client.securityGroups.listRuleInstances(group.uuid, { limit: 1 }),
      );
      if (instances?.rule_instances[0]) {
        const instance = instances.rule_instances[0];
        await h.check('securityGroups.getRuleInstance', () =>
          client.securityGroups.getRuleInstance(group.uuid, instance.uuid),
        );
        await h.check('securityGroups.updateRuleInstance', () =>
          client.securityGroups.updateRuleInstance(
            group.uuid,
            instance.uuid,
            ModelSecurityRuleInstanceUpdateRequestSchema.parse({
              security_group_uuid: group.uuid,
              state: instance.state,
            }),
          ),
        );
      }
      const versions = await h.check('securityGroups.listRuleInstanceVersions', () =>
        client.securityGroups.listRuleInstanceVersions(group.uuid, { limit: 1 }),
      );
      if (versions?.versions[0])
        await h.check('securityGroups.history', () =>
          client.securityGroups.listRuleInstances(group.uuid, {
            generation: versions.versions[0].generation,
          }),
        );
      const rule = await h.check('customRules.create', () =>
        client.customRules.create({
          name: tag,
          compatible_sources: ['LOCAL'],
          condition: { type: 'label', key: 'sdk_e2e', operator: 'not_exists' },
          violation_message: 'SDK test label is missing',
          rule_action: 'FAIL',
        }),
      );
      if (rule) {
        h.own('model-security.custom-rule', rule.uuid, tag);
        h.defer('customRules.archive', () => client.customRules.archive(rule.uuid));
        await h.check('customRules.get', () => client.customRules.get(rule.uuid));
        await h.check('customRules.update', () =>
          client.customRules.update(rule.uuid, {
            description: 'Updated SDK fixture',
            remediation_message: 'Add the sdk_e2e label.',
          }),
        );
        const assigned = await h.check('customRules.assign', () =>
          client.customRules.assignSecurityGroups(rule.uuid, {
            assignments: [{ security_group_uuid: group.uuid, state: 'BLOCKING' }],
          }),
        );
        if (assigned)
          await h.check('customRules.assignment-result', async () =>
            assert(assigned.results.every((r) => r.rule_instance_uuid && !r.error)),
          );
        h.defer('customRules.removeAssignment', () =>
          client.customRules.removeAssignment(rule.uuid, group.uuid),
        );
        await h.check('customRules.listSecurityGroups', () =>
          client.customRules.listSecurityGroups(rule.uuid, { limit: 1 }),
        );
        await h.check('customRules.archive', () => client.customRules.archive(rule.uuid));
        await h.check('customRules.unarchive', () => client.customRules.unarchive(rule.uuid));
      }
      const scan = await h.check('scans.create', () =>
        client.scans.create({
          model_uri: `/${tag}/model.safetensors`,
          security_group_uuid: group.uuid,
          scan_origin: 'MODEL_SECURITY_SDK',
          model_name: tag,
          labels: [{ key: 'sdk_e2e', value: tag }],
          // An explicitly synthetic, benign scanner-result fixture. This tests ingestion, not a local ML scanner engine.
          scan_details: {
            scanner_version: '1.0.0',
            time_started: new Date().toISOString(),
            files: [
              {
                file_path: 'model.safetensors',
                modelscan_status: 'SCANNED',
                blob_id: randomUUID(),
                formats: ['SAFETENSORS'],
                issues_detected: [],
                sha256: createHash('sha256')
                  .update('SDK synthetic benign scanner fixture')
                  .digest('hex'),
                size_bytes: 35,
              },
            ],
            total_files_scanned: 1,
            total_files_skipped: 0,
            model_formats: ['SAFETENSORS'],
            model_size_bytes: 35,
            scan_duration_ms: 1,
          },
        }),
      );
      if (scan) {
        h.own('model-security.scan-audit-record', scan.uuid, tag);
        await h.check('scans.get', () => client.scans.get(scan.uuid));
        await h.check('scans.getFiles', () => client.scans.getFiles(scan.uuid, { limit: 1 }));
        const evaluations = await h.check('scans.getEvaluations', () =>
          client.scans.getEvaluations(scan.uuid, { limit: 1 }),
        );
        if (evaluations?.evaluations[0])
          await h.check('scans.getEvaluation', () =>
            client.scans.getEvaluation(evaluations.evaluations[0].uuid),
          );
        const violations = await h.check('scans.getViolations', () =>
          client.scans.getViolations(scan.uuid, { limit: 1 }),
        );
        if (violations?.violations[0])
          await h.check('scans.getViolation', () =>
            client.scans.getViolation(violations.violations[0].uuid),
          );
        await h.check('scans.addLabels', () =>
          client.scans.addLabels(scan.uuid, { labels: [{ key: 'sdk_phase', value: 'created' }] }),
        );
        await h.check('scans.setLabels', () =>
          client.scans.setLabels(scan.uuid, { labels: [{ key: 'sdk_e2e', value: tag }] }),
        );
        await h.check('scans.deleteLabels', () =>
          client.scans.deleteLabels(scan.uuid, ['sdk_e2e']),
        );
        await h.check('scans.getLabelKeys', () => client.scans.getLabelKeys({ limit: 1 }));
        await h.check('scans.getLabelValues', () =>
          client.scans.getLabelValues('sdk_e2e', { limit: 1 }),
        );
      }
    }
  } else
    h.skip(
      'model-security.write-workflows',
      'Pass --writes; scan audit records and archived rules cannot be hard-deleted by this API.',
    );
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  await h.cleanup();
  credentials.verifyUnchanged();
  h.finish('model-security', true);
}
