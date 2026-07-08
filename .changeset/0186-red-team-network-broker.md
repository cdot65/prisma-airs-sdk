---
'@cdot65/prisma-airs-sdk': minor
---

Add a Red Team Network Broker channel sub-client. `RedTeamClient.networkBroker` exposes `listChannels`, `createChannel`, `getChannel`, `updateChannel`, and `getChannelStats` against the network broker data plane, letting you discover and manage the channel UUIDs referenced by Red Team targets (`network_broker_channel_uuid`). The endpoint is overridable via the `networkBrokerEndpoint` option or `PANW_RED_TEAM_NETWORK_BROKER_ENDPOINT`. Adds typed request/response models and Zod schemas (`Channel`, `ChannelStats`, `ChannelStatus`, create/update requests, and channel list types).
