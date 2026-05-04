/** @internal Minimal-valid mocks for red-team response schemas, shared across spec files. */

export const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

const isoNow = '2025-01-01T00:00:00Z';

export function targetRefMock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uuid: VALID_UUID,
    tsg_id: 'tsg-1',
    name: 't',
    status: 'READY',
    active: true,
    validated: true,
    created_at: isoNow,
    updated_at: isoNow,
    ...overrides,
  };
}

export function jobMock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uuid: VALID_UUID,
    tsg_id: 'tsg-1',
    name: 'job',
    target: targetRefMock(),
    job_type: 'STATIC',
    job_metadata: {},
    target_id: VALID_UUID,
    target_type: 'API',
    ...overrides,
  };
}

export function paginatedListMock(data: unknown[] = []): Record<string, unknown> {
  return { pagination: { total_items: data.length }, data };
}

export function categoryMock(): Record<string, unknown> {
  return {
    id: 'jailbreak',
    display_name: 'Jailbreak',
    description: 'Category description',
    sub_categories: [],
  };
}

export function jobAbortMock(): Record<string, unknown> {
  return { job_id: VALID_UUID, message: 'aborted' };
}

export function targetMock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...targetRefMock(),
    ...overrides,
  };
}

export function targetListMock(items: unknown[] = []): Record<string, unknown> {
  return paginatedListMock(items);
}

export function targetProfileMock(): Record<string, unknown> {
  return {
    target_id: VALID_UUID,
    target_version: 1,
    status: 'READY',
  };
}

export function targetTemplateCollectionMock(): Record<string, unknown> {
  return {
    OPENAI: {},
    HUGGING_FACE: {},
    DATABRICKS: {},
    BEDROCK: {},
    REST: {},
    STREAMING: {},
    WEBSOCKET: {},
  };
}

export function targetAuthValidationMock(): Record<string, unknown> {
  return { validated: true };
}

export function baseResponseMock(): Record<string, unknown> {
  return { message: 'ok', status: 200 };
}

export function eulaContentMock(): Record<string, unknown> {
  return { content: 'EULA text here...' };
}

export function eulaResponseMock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { is_accepted: true, accepted_at: isoNow, ...overrides };
}

export function instanceMock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tenant_id: 'tenant-1',
    status: 'ACTIVE',
    ...overrides,
  };
}

export function instanceGetMock(): Record<string, unknown> {
  return { tenant_id: 'tenant-1', status: 'ACTIVE', devices: [] };
}

export function deviceResponseMock(): Record<string, unknown> {
  return { devices: [] };
}

export function registryCredentialsMock(): Record<string, unknown> {
  return { token: 'tok', expires_at: isoNow, registry_url: 'https://registry.example.com' };
}

export function promptSetMock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uuid: VALID_UUID,
    name: 'set',
    active: true,
    archive: false,
    status: 'READY',
    created_at: isoNow,
    updated_at: isoNow,
    ...overrides,
  };
}

export function promptSetListMock(items: unknown[] = []): Record<string, unknown> {
  return paginatedListMock(items);
}

export function promptSetReferenceMock(): Record<string, unknown> {
  return {
    uuid: VALID_UUID,
    name: 'set',
    status: 'READY',
    active: true,
    tsg_id: 'tsg-1',
    created_at: isoNow,
    updated_at: isoNow,
  };
}

export function promptSetVersionInfoMock(): Record<string, unknown> {
  return { uuid: VALID_UUID, status: 'READY', is_latest: true };
}

export function promptSetListActiveMock(): Record<string, unknown> {
  return { data: [] };
}

export function promptMock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uuid: VALID_UUID,
    prompt: 'prompt text',
    user_defined_goal: false,
    status: 'READY',
    active: true,
    prompt_set_id: VALID_UUID,
    created_at: isoNow,
    updated_at: isoNow,
    ...overrides,
  };
}

export function promptListMock(items: unknown[] = []): Record<string, unknown> {
  return paginatedListMock(items);
}

export function customAttackReportMock(): Record<string, unknown> {
  return {
    total_prompts: 0,
    total_attacks: 0,
    total_threats: 0,
    failed_attacks: 0,
    score: 0,
    asr: 0,
    custom_attack_reports: [],
    property_statistics: [],
    job_id: VALID_UUID,
  };
}

export function promptSetsReportMock(items: unknown[] = []): Record<string, unknown> {
  return { prompt_sets: items, total_prompt_sets: items.length };
}

export function promptDetailMock(): Record<string, unknown> {
  return {
    prompt_id: VALID_UUID,
    prompt_text: 'p',
  };
}

export function customAttacksListMock(items: unknown[] = []): Record<string, unknown> {
  return {
    pagination: { total_items: items.length },
    data: items,
    total_attacks: items.length,
    total_threats: 0,
  };
}

export function customAttackOutputMock(): Record<string, unknown> {
  return {
    uuid: VALID_UUID,
    tsg_id: 'tsg-1',
    custom_attack_id: VALID_UUID,
    job_id: VALID_UUID,
    target_id: VALID_UUID,
    output: '',
  };
}

export function propertyStatMock(): Record<string, unknown> {
  return { property_name: 'category', values: [] };
}

export function propertyNamesMock(items: string[] = []): Record<string, unknown> {
  return { data: items };
}

export function propertyValuesMock(
  name = 'severity',
  items: string[] = [],
): Record<string, unknown> {
  return { name, values: items };
}

export function propertyValuesMultipleMock(): Record<string, unknown> {
  return { data: {} };
}

export function attackListMock(items: unknown[] = []): Record<string, unknown> {
  return paginatedListMock(items);
}

export function attackDetailMock(): Record<string, unknown> {
  return {
    uuid: VALID_UUID,
    tsg_id: 'tsg-1',
    job_id: VALID_UUID,
    target_id: VALID_UUID,
    prompt: 'p',
    prompt_mapping_id: VALID_UUID,
    prompt_id: VALID_UUID,
    category: 'jailbreak',
    sub_category: 'jb-1',
    category_display_name: 'Jailbreak',
    sub_category_display_name: 'JB 1',
    compliance_frameworks: [],
    goal: null,
  };
}

export function attackMultiTurnDetailMock(): Record<string, unknown> {
  return attackDetailMock();
}

export function staticReportMock(): Record<string, unknown> {
  return {
    severity_report: { stats: [] },
  };
}

export function dynamicReportMock(): Record<string, unknown> {
  return {};
}

export function remediationMock(): Record<string, unknown> {
  return { remediations: [] };
}

export function runtimePolicyMock(): Record<string, unknown> {
  return { runtime_security_profile: null };
}

export function goalListMock(items: unknown[] = []): Record<string, unknown> {
  return paginatedListMock(items);
}

export function streamListMock(items: unknown[] = []): Record<string, unknown> {
  return paginatedListMock(items);
}

export function streamDetailMock(): Record<string, unknown> {
  return {
    uuid: VALID_UUID,
    tsg_id: 'tsg-1',
    job_id: VALID_UUID,
    target_id: VALID_UUID,
    goal_id: VALID_UUID,
  };
}

export function scanStatisticsMock(): Record<string, unknown> {
  return { total_scans: 10, targets_scanned: 5 };
}

export function scoreTrendMock(): Record<string, unknown> {
  return { labels: [], series: [] };
}

export function quotaSummaryMock(): Record<string, unknown> {
  const detail = { allocated: 100, unlimited: false, consumed: 5 };
  return { static: detail, dynamic: detail, custom: detail };
}

export function errorLogListMock(items: unknown[] = []): Record<string, unknown> {
  return paginatedListMock(items);
}

export function sentimentMock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { job_id: VALID_UUID, up_vote: true, ...overrides };
}

export function dashboardOverviewMock(): Record<string, unknown> {
  return { total_targets: 7, targets_by_type: [] };
}
