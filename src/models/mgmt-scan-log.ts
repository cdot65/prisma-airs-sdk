import { z } from 'zod';

/** Zod schema for a scan result entry from the scan logs view. */
export const ScanResultEntrySchema = z
  .object({
    csp_id: z.string(),
    tsg_id: z.string(),
    scan_id: z.string(),
    scan_sub_req_id: z.number(),
    api_key_name: z.string(),
    app_name: z.string(),
    tokens: z.number(),
    text_records: z.number(),
    transaction_id: z.string().optional(),
    profile_id: z.string().optional(),
    profile_name: z.string().optional(),
    model_name: z.string().optional(),
    user: z.string().optional(),
    environment: z.string().optional(),
    cloud_provider: z.string().optional(),
    agent_framework: z.string().optional(),
    report_id: z.string().optional(),
    received_ts: z.string().optional(),
    completed_ts: z.string().optional(),
    status: z.string().optional(),
    verdict: z.string().optional(),
    action: z.string().optional(),
    is_prompt: z.boolean().optional(),
    is_response: z.boolean().optional(),
    pi_final_verdict: z.string().optional(),
    uf_final_verdict: z.string().optional(),
    dlp_final_verdict: z.string().optional(),
    dbs_final_verdict: z.string().optional(),
    tc_final_verdict: z.string().optional(),
    mc_final_verdict: z.string().optional(),
    agent_final_verdict: z.string().optional(),
    cg_final_verdict: z.string().optional(),
    tg_final_verdict: z.string().optional(),
    prompt_pi_verdict: z.string().optional(),
    prompt_uf_verdict: z.string().optional(),
    prompt_dlp_verdict: z.string().optional(),
    prompt_tc_verdict: z.string().optional(),
    prompt_mc_verdict: z.string().optional(),
    prompt_agent_verdict: z.string().optional(),
    prompt_tg_verdict: z.string().optional(),
    prompt_verdict: z.string().optional(),
    prompt_pi_action: z.string().optional(),
    prompt_uf_action: z.string().optional(),
    prompt_dlp_action: z.string().optional(),
    prompt_tc_action: z.string().optional(),
    prompt_mc_action: z.string().optional(),
    prompt_agent_action: z.string().optional(),
    prompt_tg_action: z.string().optional(),
    response_uf_verdict: z.string().optional(),
    response_dlp_verdict: z.string().optional(),
    response_dbs_verdict: z.string().optional(),
    response_tc_verdict: z.string().optional(),
    response_mc_verdict: z.string().optional(),
    response_agent_verdict: z.string().optional(),
    response_cg_verdict: z.string().optional(),
    response_tg_verdict: z.string().optional(),
    response_uf_action: z.string().optional(),
    response_dlp_action: z.string().optional(),
    response_dbs_action: z.string().optional(),
    response_tc_action: z.string().optional(),
    response_mc_action: z.string().optional(),
    response_agent_action: z.string().optional(),
    response_cg_action: z.string().optional(),
    response_tg_action: z.string().optional(),
    response_verdict: z.string().optional(),
    detection_service_flags: z.number().optional(),
    content_masked: z.boolean().optional(),
    user_ip: z.string().optional(),
  })
  .passthrough();

/** Scan result entry from scan logs. */
export type ScanResultEntry = z.infer<typeof ScanResultEntrySchema>;

/** Zod schema for scan result dashboard data. */
export const ScanResultForDashboardSchema = z
  .object({
    text_records_count: z.number().optional(),
    api_calls_count: z.number().optional(),
    threats_count: z.number().optional(),
    all_transactions_count: z.number().optional(),
    benign_transaction_count: z.number().optional(),
    scan_result_entries: z.array(ScanResultEntrySchema).optional(),
  })
  .passthrough();

/** Scan result dashboard summary. */
export type ScanResultForDashboard = z.infer<typeof ScanResultForDashboardSchema>;

/** Zod schema for paginated scan results response. */
export const PaginatedScanResultsSchema = z
  .object({
    scan_result_for_dashboard: ScanResultForDashboardSchema.optional(),
    total_pages: z.number().optional(),
    page_number: z.number().optional(),
    page_size: z.number().optional(),
    page_token: z.string().optional(),
    revision: z.number().optional(),
  })
  .passthrough();

/** Paginated scan results response. */
export type PaginatedScanResults = z.infer<typeof PaginatedScanResultsSchema>;
