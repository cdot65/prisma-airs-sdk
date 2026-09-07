import {
  AIGatewayClient,
  AIGatewayInferenceClient,
  AIGatewayChartFiltersSchema,
  type AIGatewayChartFilters,
  type AIGatewayChartOptions,
  type AIGatewayGroupOptions,
  type AIGatewayRequestChartOptions,
  type GatewayRealtimeConnection,
  type GatewayWebSocketFactory,
  GatewayRealtimeEventSchema,
  GatewayRealtimeConnectRequestSchema,
} from '@cdot65/prisma-airs-sdk';

async function verify(
  gateway: AIGatewayClient,
  runtime: AIGatewayInferenceClient,
  factory: GatewayWebSocketFactory,
) {
  const options: AIGatewayChartOptions = {
    workspaceSlug: 'ws-dev',
    metadata: { tag: 'owned' },
    traceId: 'owned',
    statusCodes: [200, 446],
    apiKeyIds: ['11111111-1111-4111-8111-111111111111'],
    aiOrgModels: ['openai__gpt-5.6-terra'],
    totalUnitsMin: 0,
    totalUnitsMax: 42,
    costMin: 0,
    costMax: 0.125,
  };
  const parsedFilters: AIGatewayChartFilters = AIGatewayChartFiltersSchema.parse({
    statusCodes: [200],
    costMax: 0,
  });
  await gateway.telemetry.cost({ workspaceSlug: 'ws-dev', ...parsedFilters });
  const compatible: AIGatewayRequestChartOptions = options;
  await gateway.telemetry.requests(compatible);
  await gateway.telemetry.cost(options);
  await gateway.telemetry.tokens(options);
  const grouped: AIGatewayGroupOptions = { ...options, columns: ['cost', 'total_tokens'] };
  await gateway.telemetry.groupBy('model', grouped);
  await gateway.telemetry.groupBy('provider', grouped);
  await gateway.telemetry.byStatusCode(grouped);
  await gateway.telemetry.byUser(options);
  // @ts-expect-error User grouping does not accept extra columns.
  await gateway.telemetry.byUser({ workspaceSlug: 'ws-dev', columns: ['cost'] });
  // @ts-expect-error Group filters do not coerce numeric strings.
  await gateway.telemetry.groupBy('model', { workspaceSlug: 'ws-dev', costMin: '0' });
  // @ts-expect-error Group filters preserve string-only metadata.
  await gateway.telemetry.byStatusCode({ workspaceSlug: 'ws-dev', metadata: { count: 1 } });
  const latency = await gateway.telemetry.latency(options);
  const nullable: number | null = latency.data.total;
  // @ts-expect-error Empty aggregates cannot be used as definite numbers.
  const definite: number = latency.data.p99;
  // @ts-expect-error Metadata values must be strings.
  await gateway.telemetry.cost({ workspaceSlug: 'ws-dev', metadata: { count: 1 } });
  // @ts-expect-error Unverified prompt-token filters remain unexposed.
  await gateway.telemetry.tokens({ workspaceSlug: 'ws-dev', promptTokenMin: 1 });
  // @ts-expect-error List inputs are structured arrays, not pre-serialized query strings.
  await gateway.telemetry.requests({ workspaceSlug: 'ws-dev', statusCodes: '200,446' });
  // @ts-expect-error Numeric bounds do not accept string coercion.
  await gateway.telemetry.cost({ workspaceSlug: 'ws-dev', costMin: '0' });
  // @ts-expect-error Other chart methods do not gain these filters.
  await gateway.telemetry.errors({ workspaceSlug: 'ws-dev', statusCodes: [200] });
  const connection: GatewayRealtimeConnection = await runtime.connectRealtime(
    GatewayRealtimeConnectRequestSchema.parse({ model: '@openai/gpt-5.6-terra' }),
    { webSocketFactory: factory, timeoutMs: 1000 },
  );
  connection.send(GatewayRealtimeEventSchema.parse({ type: 'session.update', session: {} }));
  for await (const event of connection) {
    const type: string = event.type;
    void type;
    break;
  }
  await connection.cancel();
  // @ts-expect-error Caller-owned transport is required.
  await runtime.connectRealtime({});
  void nullable;
  void definite;
}
void verify;
