---
'@cdot65/prisma-airs-sdk': patch
---

Fix the Network Broker `ChannelStats` schema field names to match the actual API (verified live). `getChannelStats()` previously modeled non-existent fields (`broker_server`, `registry`, `chart`, `image`, `online_channel_count`, `total_channel_count`) so every typed accessor returned `undefined`. They are now `network_channels_server_domain`, `docker_registry`, `helm_chart`, `docker_image`, `online_channels`, `total_channels`, plus `client_version`. `Channel` also gains the live-observed `added_by`, `last_online_at`, `connected_clients_count`, `outdated_clients_count`, and `features` fields. The Network Broker OpenAPI spec is now committed so preflight validates these schemas going forward.
