/** Generated, typed runtime resource operations from Portkey SHA-256 de7a1bd98bdb2edb7428a33054d9f6000b9568d1cd5b603d1a8302c053d094d9. */
import { request } from '../http/request.js';
import { queryParams } from '../http/query.js';
import { assertUuid } from '../validators.js';
import type { RequestSpec } from '../http/types.js';
import type { GatewayInferenceRequestOptions } from './inference-client.js';
import { gatewayPathSegment, gatewayMultipart } from './runtime-wire.js';
import {
  type GatewayInferenceInputCreateImageRequest,
  GatewayInferenceInputCreateImageRequestSchema,
  type GatewayInferenceImagesResponse,
  GatewayInferenceImagesResponseSchema,
  type GatewayInferenceInputCreateImageEditRequest,
  GatewayInferenceInputCreateImageEditRequestSchema,
  type GatewayInferenceInputCreateImageVariationRequest,
  GatewayInferenceInputCreateImageVariationRequestSchema,
  type GatewayInferenceInputCreateRerankRequest,
  GatewayInferenceInputCreateRerankRequestSchema,
  type GatewayInferenceCreateRerankResponse,
  GatewayInferenceCreateRerankResponseSchema,
  type GatewayInferenceInputCreateOcrRequest,
  GatewayInferenceInputCreateOcrRequestSchema,
  type GatewayInferenceCreateOcrResponse,
  GatewayInferenceCreateOcrResponseSchema,
  type GatewayInferenceInputCreateSpeechRequest,
  GatewayInferenceInputCreateSpeechRequestSchema,
  type GatewayInferenceInputCreateTranscriptionRequest,
  GatewayInferenceInputCreateTranscriptionRequestSchema,
  type GatewayInferenceCreateTranscriptionResponseJson,
  GatewayInferenceCreateTranscriptionResponseJsonSchema,
  type GatewayInferenceCreateTranscriptionResponseVerboseJson,
  GatewayInferenceCreateTranscriptionResponseVerboseJsonSchema,
  type GatewayInferenceInputCreateTranslationRequest,
  GatewayInferenceInputCreateTranslationRequestSchema,
  type GatewayInferenceCreateTranslationResponseJson,
  GatewayInferenceCreateTranslationResponseJsonSchema,
  type GatewayInferenceCreateTranslationResponseVerboseJson,
  GatewayInferenceCreateTranslationResponseVerboseJsonSchema,
  type GatewayInferenceInputListFilesQuery,
  GatewayInferenceInputListFilesQuerySchema,
  type GatewayInferenceListFilesResponse,
  GatewayInferenceListFilesResponseSchema,
  type GatewayInferenceInputCreateFileRequest,
  GatewayInferenceInputCreateFileRequestSchema,
  type GatewayInferenceOpenAIFile,
  GatewayInferenceOpenAIFileSchema,
  type GatewayInferenceDeleteFileResponse,
  GatewayInferenceDeleteFileResponseSchema,
  type GatewayInferenceInputCreateFineTuningJobRequest,
  GatewayInferenceInputCreateFineTuningJobRequestSchema,
  type GatewayInferenceFineTuningJob,
  GatewayInferenceFineTuningJobSchema,
  type GatewayInferenceInputListPaginatedFineTuningJobsQuery,
  GatewayInferenceInputListPaginatedFineTuningJobsQuerySchema,
  type GatewayInferenceListPaginatedFineTuningJobsResponse,
  GatewayInferenceListPaginatedFineTuningJobsResponseSchema,
  type GatewayInferenceInputListFineTuningEventsQuery,
  GatewayInferenceInputListFineTuningEventsQuerySchema,
  type GatewayInferenceListFineTuningJobEventsResponse,
  GatewayInferenceListFineTuningJobEventsResponseSchema,
  type GatewayInferenceInputListFineTuningJobCheckpointsQuery,
  GatewayInferenceInputListFineTuningJobCheckpointsQuerySchema,
  type GatewayInferenceListFineTuningJobCheckpointsResponse,
  GatewayInferenceListFineTuningJobCheckpointsResponseSchema,
  type GatewayInferenceInputListModelsQuery,
  GatewayInferenceInputListModelsQuerySchema,
  type GatewayInferenceListModelsResponse,
  GatewayInferenceListModelsResponseSchema,
  type GatewayInferenceModel,
  GatewayInferenceModelSchema,
  type GatewayInferenceDeleteModelResponse,
  GatewayInferenceDeleteModelResponseSchema,
  type GatewayInferenceInputCreateModerationRequest,
  GatewayInferenceInputCreateModerationRequestSchema,
  type GatewayInferenceCreateModerationResponse,
  GatewayInferenceCreateModerationResponseSchema,
  type GatewayInferenceInputGetResponseQuery,
  GatewayInferenceInputGetResponseQuerySchema,
  type GatewayInferenceResponse,
  GatewayInferenceResponseSchema,
  type GatewayInferenceInputListInputItemsQuery,
  GatewayInferenceInputListInputItemsQuerySchema,
  type GatewayInferenceResponseItemList,
  GatewayInferenceResponseItemListSchema,
  type GatewayInferenceInputListVectorStoresQuery,
  GatewayInferenceInputListVectorStoresQuerySchema,
  type GatewayInferenceListVectorStoresResponse,
  GatewayInferenceListVectorStoresResponseSchema,
  type GatewayInferenceInputCreateVectorStoreRequest,
  GatewayInferenceInputCreateVectorStoreRequestSchema,
  type GatewayInferenceVectorStoreObject,
  GatewayInferenceVectorStoreObjectSchema,
  type GatewayInferenceInputUpdateVectorStoreRequest,
  GatewayInferenceInputUpdateVectorStoreRequestSchema,
  type GatewayInferenceDeleteVectorStoreResponse,
  GatewayInferenceDeleteVectorStoreResponseSchema,
  type GatewayInferenceInputListVectorStoreFilesQuery,
  GatewayInferenceInputListVectorStoreFilesQuerySchema,
  type GatewayInferenceListVectorStoreFilesResponse,
  GatewayInferenceListVectorStoreFilesResponseSchema,
  type GatewayInferenceInputCreateVectorStoreFileRequest,
  GatewayInferenceInputCreateVectorStoreFileRequestSchema,
  type GatewayInferenceVectorStoreFileObject,
  GatewayInferenceVectorStoreFileObjectSchema,
  type GatewayInferenceDeleteVectorStoreFileResponse,
  GatewayInferenceDeleteVectorStoreFileResponseSchema,
  type GatewayInferenceInputCreateVectorStoreFileBatchRequest,
  GatewayInferenceInputCreateVectorStoreFileBatchRequestSchema,
  type GatewayInferenceVectorStoreFileBatchObject,
  GatewayInferenceVectorStoreFileBatchObjectSchema,
  type GatewayInferenceInputListFilesInVectorStoreBatchQuery,
  GatewayInferenceInputListFilesInVectorStoreBatchQuerySchema,
  type GatewayInferenceInputCreateBatchRequest,
  GatewayInferenceInputCreateBatchRequestSchema,
  type GatewayInferenceBatch,
  GatewayInferenceBatchSchema,
  type GatewayInferenceInputListBatchesQuery,
  GatewayInferenceInputListBatchesQuerySchema,
  type GatewayInferenceListBatchesResponse,
  GatewayInferenceListBatchesResponseSchema,
  type GatewayInferenceInputFeedbackRequest,
  GatewayInferenceInputFeedbackRequestSchema,
  type GatewayInferenceFeedbackResponse,
  GatewayInferenceFeedbackResponseSchema,
  type GatewayInferenceInputFeedbackUpdateRequest,
  GatewayInferenceInputFeedbackUpdateRequestSchema,
  type GatewayInferenceInputCreateLogsRequest,
  GatewayInferenceInputCreateLogsRequestSchema,
  type GatewayInferenceInputGetLogQuery,
  GatewayInferenceInputGetLogQuerySchema,
  type GatewayInferenceLogObject,
  GatewayInferenceLogObjectSchema,
} from '../models/ai-gateway-inference.js';

/** @internal Inherited by the public inference client; no separate credentials or token cache. */
export abstract class AIGatewayRuntimeResourcesClient {
  protected abstract runtimeRequestOptions(
    options: GatewayInferenceRequestOptions,
  ): Pick<
    RequestSpec,
    | 'baseUrl'
    | 'auth'
    | 'numRetries'
    | 'timeoutMs'
    | 'signal'
    | 'fetch'
    | 'headers'
    | 'redirect'
    | 'omitDebugBody'
  >;
  /** POST /images/generations. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental Offline JSON contract only. The prescribed-model generation probe returned HTTP 400; no alternate model used. Outside stability guarantees until live-verified.
   * @example `await inference.createImage(body);`
   */
  async createImage(
    body: GatewayInferenceInputCreateImageRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceImagesResponse> {
    return request<GatewayInferenceImagesResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/images/generations`,
      body,
      requestSchema: GatewayInferenceInputCreateImageRequestSchema,
      responseSchema: GatewayInferenceImagesResponseSchema,
    });
  }

  /** POST /images/edits. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental Offline multipart contract only. The prescribed-model edit probe returned HTTP 400; successful live editing is unverified. Outside stability guarantees until live-verified.
   * @example `await inference.createImageEdit(body);`
   */
  async createImageEdit(
    body: GatewayInferenceInputCreateImageEditRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceImagesResponse> {
    return request<GatewayInferenceImagesResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/images/edits`,
      body,
      requestSchema: GatewayInferenceInputCreateImageEditRequestSchema,
      encodeFormData: gatewayMultipart,
      responseSchema: GatewayInferenceImagesResponseSchema,
    });
  }

  /** POST /images/variations. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental Offline multipart contract only. The prescribed-model variation probe returned HTTP 404; successful live variation is unverified. Outside stability guarantees until live-verified.
   * @example `await inference.createImageVariation(body);`
   */
  async createImageVariation(
    body: GatewayInferenceInputCreateImageVariationRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceImagesResponse> {
    return request<GatewayInferenceImagesResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/images/variations`,
      body,
      requestSchema: GatewayInferenceInputCreateImageVariationRequestSchema,
      encodeFormData: gatewayMultipart,
      responseSchema: GatewayInferenceImagesResponseSchema,
    });
  }

  /** POST /rerank. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental Offline JSON contract only. The prescribed-provider rerank probe returned HTTP 500; no different provider was configured. Outside stability guarantees until live-verified.
   * @example `await inference.createRerank(body);`
   */
  async createRerank(
    body: GatewayInferenceInputCreateRerankRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceCreateRerankResponse> {
    return request<GatewayInferenceCreateRerankResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/rerank`,
      body,
      requestSchema: GatewayInferenceInputCreateRerankRequestSchema,
      responseSchema: GatewayInferenceCreateRerankResponseSchema,
    });
  }

  /** POST /ocr. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental Offline JSON contract only. The prescribed-provider OCR probe returned HTTP 500; no different provider was configured. Outside stability guarantees until live-verified.
   * @example `await inference.createOcr(body);`
   */
  async createOcr(
    body: GatewayInferenceInputCreateOcrRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceCreateOcrResponse> {
    return request<GatewayInferenceCreateOcrResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/ocr`,
      body,
      requestSchema: GatewayInferenceInputCreateOcrRequestSchema,
      responseSchema: GatewayInferenceCreateOcrResponseSchema,
    });
  }

  /** POST /audio/speech. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental Offline binary-response contract only. The prescribed-model speech probe returned HTTP 404; no audio model was substituted. Outside stability guarantees until live-verified.
   * @example `await inference.createSpeech(body);`
   */
  async createSpeech(
    body: GatewayInferenceInputCreateSpeechRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<Uint8Array> {
    return request<Uint8Array>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/audio/speech`,
      body,
      requestSchema: GatewayInferenceInputCreateSpeechRequestSchema,
      responseType: 'bytes',
    });
  }

  /** POST /audio/transcriptions. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental Offline multipart/format-specific response contracts only. The prescribed-model transcription probe returned HTTP 400 with model incompatibility. Outside stability guarantees until live-verified.
   * @example `await inference.createTranscription(body);`
   */
  createTranscription(
    body: GatewayInferenceInputCreateTranscriptionRequest & { response_format?: 'json' },
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayInferenceCreateTranscriptionResponseJson>;
  createTranscription(
    body: GatewayInferenceInputCreateTranscriptionRequest & { response_format: 'verbose_json' },
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayInferenceCreateTranscriptionResponseVerboseJson>;
  createTranscription(
    body: GatewayInferenceInputCreateTranscriptionRequest & {
      response_format: 'text' | 'srt' | 'vtt';
    },
    options?: GatewayInferenceRequestOptions,
  ): Promise<string>;
  createTranscription(
    body: GatewayInferenceInputCreateTranscriptionRequest,
    options?: GatewayInferenceRequestOptions,
  ): Promise<
    | GatewayInferenceCreateTranscriptionResponseJson
    | GatewayInferenceCreateTranscriptionResponseVerboseJson
    | string
  >;
  async createTranscription(
    body: GatewayInferenceInputCreateTranscriptionRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<
    | GatewayInferenceCreateTranscriptionResponseJson
    | GatewayInferenceCreateTranscriptionResponseVerboseJson
    | string
  > {
    return request<
      | GatewayInferenceCreateTranscriptionResponseJson
      | GatewayInferenceCreateTranscriptionResponseVerboseJson
      | string
    >({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/audio/transcriptions`,
      body,
      requestSchema: GatewayInferenceInputCreateTranscriptionRequestSchema,
      encodeFormData: gatewayMultipart,
      responseType: ['text', 'srt', 'vtt'].includes(body?.response_format ?? '')
        ? 'text'
        : undefined,
      responseSchema:
        body?.response_format === 'verbose_json'
          ? GatewayInferenceCreateTranscriptionResponseVerboseJsonSchema
          : GatewayInferenceCreateTranscriptionResponseJsonSchema,
    });
  }

  /** POST /audio/translations. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental Offline multipart/format-specific response contracts only. The prescribed-model translation probe returned HTTP 400 with model incompatibility. Outside stability guarantees until live-verified.
   * @example `await inference.createTranslation(body);`
   */
  createTranslation(
    body: GatewayInferenceInputCreateTranslationRequest & { response_format?: 'json' },
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayInferenceCreateTranslationResponseJson>;
  createTranslation(
    body: GatewayInferenceInputCreateTranslationRequest & { response_format: 'verbose_json' },
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayInferenceCreateTranslationResponseVerboseJson>;
  createTranslation(
    body: GatewayInferenceInputCreateTranslationRequest & {
      response_format: 'text' | 'srt' | 'vtt';
    },
    options?: GatewayInferenceRequestOptions,
  ): Promise<string>;
  createTranslation(
    body: GatewayInferenceInputCreateTranslationRequest,
    options?: GatewayInferenceRequestOptions,
  ): Promise<
    | GatewayInferenceCreateTranslationResponseJson
    | GatewayInferenceCreateTranslationResponseVerboseJson
    | string
  >;
  async createTranslation(
    body: GatewayInferenceInputCreateTranslationRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<
    | GatewayInferenceCreateTranslationResponseJson
    | GatewayInferenceCreateTranslationResponseVerboseJson
    | string
  > {
    return request<
      | GatewayInferenceCreateTranslationResponseJson
      | GatewayInferenceCreateTranslationResponseVerboseJson
      | string
    >({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/audio/translations`,
      body,
      requestSchema: GatewayInferenceInputCreateTranslationRequestSchema,
      encodeFormData: gatewayMultipart,
      responseType: ['text', 'srt', 'vtt'].includes(body?.response_format ?? '')
        ? 'text'
        : undefined,
      responseSchema:
        body?.response_format === 'verbose_json'
          ? GatewayInferenceCreateTranslationResponseVerboseJsonSchema
          : GatewayInferenceCreateTranslationResponseJsonSchema,
    });
  }

  /** GET /files. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.listFiles({});`
   */
  async listFiles(
    opts: GatewayInferenceInputListFilesQuery = {},
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceListFilesResponse> {
    return request<GatewayInferenceListFilesResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/files`,
      params: queryParams(opts, GatewayInferenceInputListFilesQuerySchema),
      responseSchema: GatewayInferenceListFilesResponseSchema,
    });
  }

  /** POST /files. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.createFile(body);`
   */
  async createFile(
    body: GatewayInferenceInputCreateFileRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceOpenAIFile> {
    return request<GatewayInferenceOpenAIFile>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/files`,
      body,
      requestSchema: GatewayInferenceInputCreateFileRequestSchema,
      encodeFormData: gatewayMultipart,
      responseSchema: GatewayInferenceOpenAIFileSchema,
    });
  }

  /** DELETE /files/{file_id}. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.deleteFile('resource-id');`
   */
  async deleteFile(
    file_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceDeleteFileResponse> {
    return request<GatewayInferenceDeleteFileResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'DELETE',
      path: `/files/${gatewayPathSegment(file_id)}`,
      responseSchema: GatewayInferenceDeleteFileResponseSchema,
    });
  }

  /** GET /files/{file_id}. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.retrieveFile('resource-id');`
   */
  async retrieveFile(
    file_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceOpenAIFile> {
    return request<GatewayInferenceOpenAIFile>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/files/${gatewayPathSegment(file_id)}`,
      responseSchema: GatewayInferenceOpenAIFileSchema,
    });
  }

  /** GET /files/{file_id}/content. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.downloadFile('resource-id');`
   */
  async downloadFile(
    file_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<Uint8Array> {
    return request<Uint8Array>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/files/${gatewayPathSegment(file_id)}/content`,
      responseType: 'bytes',
    });
  }

  /** POST /fine_tuning/jobs. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental No training job was started. The designated inference model does not support fine-tuning; offline contract only. Outside stability guarantees until live-verified.
   * @example `await inference.createFineTuningJob(body);`
   */
  async createFineTuningJob(
    body: GatewayInferenceInputCreateFineTuningJobRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceFineTuningJob> {
    return request<GatewayInferenceFineTuningJob>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/fine_tuning/jobs`,
      body,
      requestSchema: GatewayInferenceInputCreateFineTuningJobRequestSchema,
      responseSchema: GatewayInferenceFineTuningJobSchema,
    });
  }

  /** GET /fine_tuning/jobs. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.listPaginatedFineTuningJobs({});`
   */
  async listPaginatedFineTuningJobs(
    opts: GatewayInferenceInputListPaginatedFineTuningJobsQuery = {},
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceListPaginatedFineTuningJobsResponse> {
    return request<GatewayInferenceListPaginatedFineTuningJobsResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/fine_tuning/jobs`,
      params: queryParams(opts, GatewayInferenceInputListPaginatedFineTuningJobsQuerySchema),
      responseSchema: GatewayInferenceListPaginatedFineTuningJobsResponseSchema,
    });
  }

  /** GET /fine_tuning/jobs/{fine_tuning_job_id}. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental No owned training job was available; offline contract only. Outside stability guarantees until live-verified.
   * @example `await inference.retrieveFineTuningJob('resource-id');`
   */
  async retrieveFineTuningJob(
    fine_tuning_job_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceFineTuningJob> {
    return request<GatewayInferenceFineTuningJob>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/fine_tuning/jobs/${gatewayPathSegment(fine_tuning_job_id)}`,
      responseSchema: GatewayInferenceFineTuningJobSchema,
    });
  }

  /** GET /fine_tuning/jobs/{fine_tuning_job_id}/events. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental No owned training job was available; offline contract only. Outside stability guarantees until live-verified.
   * @example `await inference.listFineTuningEvents('resource-id', {});`
   */
  async listFineTuningEvents(
    fine_tuning_job_id: string,
    opts: GatewayInferenceInputListFineTuningEventsQuery = {},
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceListFineTuningJobEventsResponse> {
    return request<GatewayInferenceListFineTuningJobEventsResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/fine_tuning/jobs/${gatewayPathSegment(fine_tuning_job_id)}/events`,
      params: queryParams(opts, GatewayInferenceInputListFineTuningEventsQuerySchema),
      responseSchema: GatewayInferenceListFineTuningJobEventsResponseSchema,
    });
  }

  /** POST /fine_tuning/jobs/{fine_tuning_job_id}/cancel. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental No owned training job was available; existing jobs were not changed. Offline contract only. Outside stability guarantees until live-verified.
   * @example `await inference.cancelFineTuningJob('resource-id');`
   */
  async cancelFineTuningJob(
    fine_tuning_job_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceFineTuningJob> {
    return request<GatewayInferenceFineTuningJob>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/fine_tuning/jobs/${gatewayPathSegment(fine_tuning_job_id)}/cancel`,
      responseSchema: GatewayInferenceFineTuningJobSchema,
    });
  }

  /** GET /fine_tuning/jobs/{fine_tuning_job_id}/checkpoints. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental No owned training job checkpoints were available; offline contract only. Outside stability guarantees until live-verified.
   * @example `await inference.listFineTuningJobCheckpoints('resource-id', {});`
   */
  async listFineTuningJobCheckpoints(
    fine_tuning_job_id: string,
    opts: GatewayInferenceInputListFineTuningJobCheckpointsQuery = {},
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceListFineTuningJobCheckpointsResponse> {
    return request<GatewayInferenceListFineTuningJobCheckpointsResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/fine_tuning/jobs/${gatewayPathSegment(fine_tuning_job_id)}/checkpoints`,
      params: queryParams(opts, GatewayInferenceInputListFineTuningJobCheckpointsQuerySchema),
      responseSchema: GatewayInferenceListFineTuningJobCheckpointsResponseSchema,
    });
  }

  /** GET /models. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.listModels({});`
   */
  async listModels(
    opts: GatewayInferenceInputListModelsQuery = {},
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceListModelsResponse> {
    return request<GatewayInferenceListModelsResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/models`,
      params: queryParams(opts, GatewayInferenceInputListModelsQuerySchema),
      responseSchema: GatewayInferenceListModelsResponseSchema,
    });
  }

  /** GET /models/{model}. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.retrieveModel('resource-id');`
   */
  async retrieveModel(
    model: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceModel> {
    return request<GatewayInferenceModel>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/models/${gatewayPathSegment(model)}`,
      responseSchema: GatewayInferenceModelSchema,
    });
  }

  /** DELETE /models/{model}. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental No owned fine-tuned model was provisioned for deletion; offline contract only. Outside stability guarantees until live-verified.
   * @example `await inference.deleteModel('resource-id');`
   */
  async deleteModel(
    model: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceDeleteModelResponse> {
    return request<GatewayInferenceDeleteModelResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'DELETE',
      path: `/models/${gatewayPathSegment(model)}`,
      responseSchema: GatewayInferenceDeleteModelResponseSchema,
    });
  }

  /** POST /moderations. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental Offline JSON contract only. The prescribed-model moderation probe returned HTTP 400; no specialized model was substituted. Outside stability guarantees until live-verified.
   * @example `await inference.createModeration(body);`
   */
  async createModeration(
    body: GatewayInferenceInputCreateModerationRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceCreateModerationResponse> {
    return request<GatewayInferenceCreateModerationResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/moderations`,
      body,
      requestSchema: GatewayInferenceInputCreateModerationRequestSchema,
      responseSchema: GatewayInferenceCreateModerationResponseSchema,
    });
  }

  /** GET /responses/{response_id}. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.getResponse('resource-id', {});`
   */
  async getResponse(
    response_id: string,
    opts: GatewayInferenceInputGetResponseQuery = {},
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceResponse> {
    return request<GatewayInferenceResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/responses/${gatewayPathSegment(response_id)}`,
      params: queryParams(opts, GatewayInferenceInputGetResponseQuerySchema),
      responseSchema: GatewayInferenceResponseSchema,
    });
  }

  /** DELETE /responses/{response_id}. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.deleteResponse('resource-id');`
   */
  async deleteResponse(
    response_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<void> {
    return request<void>({
      ...this.runtimeRequestOptions(options),
      method: 'DELETE',
      path: `/responses/${gatewayPathSegment(response_id)}`,
    });
  }

  /** GET /responses/{response_id}/input_items. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.listInputItems('resource-id', {});`
   */
  async listInputItems(
    response_id: string,
    opts: GatewayInferenceInputListInputItemsQuery = {},
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceResponseItemList> {
    return request<GatewayInferenceResponseItemList>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/responses/${gatewayPathSegment(response_id)}/input_items`,
      params: queryParams(opts, GatewayInferenceInputListInputItemsQuerySchema),
      responseSchema: GatewayInferenceResponseItemListSchema,
    });
  }

  /** GET /vector_stores. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.listVectorStores({});`
   */
  async listVectorStores(
    opts: GatewayInferenceInputListVectorStoresQuery = {},
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceListVectorStoresResponse> {
    return request<GatewayInferenceListVectorStoresResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/vector_stores`,
      params: queryParams(opts, GatewayInferenceInputListVectorStoresQuerySchema),
      responseSchema: GatewayInferenceListVectorStoresResponseSchema,
    });
  }

  /** POST /vector_stores. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.createVectorStore(body);`
   */
  async createVectorStore(
    body: GatewayInferenceInputCreateVectorStoreRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceVectorStoreObject> {
    return request<GatewayInferenceVectorStoreObject>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/vector_stores`,
      body,
      requestSchema: GatewayInferenceInputCreateVectorStoreRequestSchema,
      responseSchema: GatewayInferenceVectorStoreObjectSchema,
    });
  }

  /** GET /vector_stores/{vector_store_id}. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.getVectorStore('resource-id');`
   */
  async getVectorStore(
    vector_store_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceVectorStoreObject> {
    return request<GatewayInferenceVectorStoreObject>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/vector_stores/${gatewayPathSegment(vector_store_id)}`,
      responseSchema: GatewayInferenceVectorStoreObjectSchema,
    });
  }

  /** POST /vector_stores/{vector_store_id}. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.modifyVectorStore('resource-id', body);`
   */
  async modifyVectorStore(
    vector_store_id: string,
    body: GatewayInferenceInputUpdateVectorStoreRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceVectorStoreObject> {
    return request<GatewayInferenceVectorStoreObject>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/vector_stores/${gatewayPathSegment(vector_store_id)}`,
      body,
      requestSchema: GatewayInferenceInputUpdateVectorStoreRequestSchema,
      responseSchema: GatewayInferenceVectorStoreObjectSchema,
    });
  }

  /** DELETE /vector_stores/{vector_store_id}. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.deleteVectorStore('resource-id');`
   */
  async deleteVectorStore(
    vector_store_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceDeleteVectorStoreResponse> {
    return request<GatewayInferenceDeleteVectorStoreResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'DELETE',
      path: `/vector_stores/${gatewayPathSegment(vector_store_id)}`,
      responseSchema: GatewayInferenceDeleteVectorStoreResponseSchema,
    });
  }

  /** GET /vector_stores/{vector_store_id}/files. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.listVectorStoreFiles('resource-id', {});`
   */
  async listVectorStoreFiles(
    vector_store_id: string,
    opts: GatewayInferenceInputListVectorStoreFilesQuery = {},
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceListVectorStoreFilesResponse> {
    return request<GatewayInferenceListVectorStoreFilesResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/vector_stores/${gatewayPathSegment(vector_store_id)}/files`,
      params: queryParams(opts, GatewayInferenceInputListVectorStoreFilesQuerySchema),
      responseSchema: GatewayInferenceListVectorStoreFilesResponseSchema,
    });
  }

  /** POST /vector_stores/{vector_store_id}/files. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.createVectorStoreFile('resource-id', body);`
   */
  async createVectorStoreFile(
    vector_store_id: string,
    body: GatewayInferenceInputCreateVectorStoreFileRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceVectorStoreFileObject> {
    return request<GatewayInferenceVectorStoreFileObject>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/vector_stores/${gatewayPathSegment(vector_store_id)}/files`,
      body,
      requestSchema: GatewayInferenceInputCreateVectorStoreFileRequestSchema,
      responseSchema: GatewayInferenceVectorStoreFileObjectSchema,
    });
  }

  /** GET /vector_stores/{vector_store_id}/files/{file_id}. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.getVectorStoreFile('resource-id', 'resource-id');`
   */
  async getVectorStoreFile(
    vector_store_id: string,
    file_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceVectorStoreFileObject> {
    return request<GatewayInferenceVectorStoreFileObject>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/vector_stores/${gatewayPathSegment(vector_store_id)}/files/${gatewayPathSegment(file_id)}`,
      responseSchema: GatewayInferenceVectorStoreFileObjectSchema,
    });
  }

  /** DELETE /vector_stores/{vector_store_id}/files/{file_id}. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.deleteVectorStoreFile('resource-id', 'resource-id');`
   */
  async deleteVectorStoreFile(
    vector_store_id: string,
    file_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceDeleteVectorStoreFileResponse> {
    return request<GatewayInferenceDeleteVectorStoreFileResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'DELETE',
      path: `/vector_stores/${gatewayPathSegment(vector_store_id)}/files/${gatewayPathSegment(file_id)}`,
      responseSchema: GatewayInferenceDeleteVectorStoreFileResponseSchema,
    });
  }

  /** POST /vector_stores/{vector_store_id}/file_batches. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.createVectorStoreFileBatch('resource-id', body);`
   */
  async createVectorStoreFileBatch(
    vector_store_id: string,
    body: GatewayInferenceInputCreateVectorStoreFileBatchRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceVectorStoreFileBatchObject> {
    return request<GatewayInferenceVectorStoreFileBatchObject>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/vector_stores/${gatewayPathSegment(vector_store_id)}/file_batches`,
      body,
      requestSchema: GatewayInferenceInputCreateVectorStoreFileBatchRequestSchema,
      responseSchema: GatewayInferenceVectorStoreFileBatchObjectSchema,
    });
  }

  /** GET /vector_stores/{vector_store_id}/file_batches/{batch_id}. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.getVectorStoreFileBatch('resource-id', 'resource-id');`
   */
  async getVectorStoreFileBatch(
    vector_store_id: string,
    batch_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceVectorStoreFileBatchObject> {
    return request<GatewayInferenceVectorStoreFileBatchObject>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/vector_stores/${gatewayPathSegment(vector_store_id)}/file_batches/${gatewayPathSegment(batch_id)}`,
      responseSchema: GatewayInferenceVectorStoreFileBatchObjectSchema,
    });
  }

  /** POST /vector_stores/{vector_store_id}/file_batches/{batch_id}/cancel. Provider routing uses options.headers['x-portkey-provider'].
   * @experimental The owned file-batch cancellation endpoint returned HTTP 500; successful cancellation remains unverified. Create, completed retrieval and file listing passed. Outside stability guarantees until live-verified.
   * @example `await inference.cancelVectorStoreFileBatch('resource-id', 'resource-id');`
   */
  async cancelVectorStoreFileBatch(
    vector_store_id: string,
    batch_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceVectorStoreFileBatchObject> {
    return request<GatewayInferenceVectorStoreFileBatchObject>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/vector_stores/${gatewayPathSegment(vector_store_id)}/file_batches/${gatewayPathSegment(batch_id)}/cancel`,
      responseSchema: GatewayInferenceVectorStoreFileBatchObjectSchema,
    });
  }

  /** GET /vector_stores/{vector_store_id}/file_batches/{batch_id}/files. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.listFilesInVectorStoreBatch('resource-id', 'resource-id', {});`
   */
  async listFilesInVectorStoreBatch(
    vector_store_id: string,
    batch_id: string,
    opts: GatewayInferenceInputListFilesInVectorStoreBatchQuery = {},
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceListVectorStoreFilesResponse> {
    return request<GatewayInferenceListVectorStoreFilesResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/vector_stores/${gatewayPathSegment(vector_store_id)}/file_batches/${gatewayPathSegment(batch_id)}/files`,
      params: queryParams(opts, GatewayInferenceInputListFilesInVectorStoreBatchQuerySchema),
      responseSchema: GatewayInferenceListVectorStoreFilesResponseSchema,
    });
  }

  /** POST /batches. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.createBatch(body);`
   */
  async createBatch(
    body: GatewayInferenceInputCreateBatchRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceBatch> {
    return request<GatewayInferenceBatch>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/batches`,
      body,
      requestSchema: GatewayInferenceInputCreateBatchRequestSchema,
      responseSchema: GatewayInferenceBatchSchema,
    });
  }

  /** GET /batches. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.listBatches({});`
   */
  async listBatches(
    opts: GatewayInferenceInputListBatchesQuery = {},
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceListBatchesResponse> {
    return request<GatewayInferenceListBatchesResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/batches`,
      params: queryParams(opts, GatewayInferenceInputListBatchesQuerySchema),
      responseSchema: GatewayInferenceListBatchesResponseSchema,
    });
  }

  /** GET /batches/{batch_id}/output. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.getBatchOutput('resource-id');`
   */
  async getBatchOutput(
    batch_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<Uint8Array> {
    return request<Uint8Array>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/batches/${gatewayPathSegment(batch_id)}/output`,
      responseType: 'bytes',
    });
  }

  /** GET /batches/{batch_id}. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.retrieveBatch('resource-id');`
   */
  async retrieveBatch(
    batch_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceBatch> {
    return request<GatewayInferenceBatch>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/batches/${gatewayPathSegment(batch_id)}`,
      responseSchema: GatewayInferenceBatchSchema,
    });
  }

  /** POST /batches/{batch_id}/cancel. Provider routing uses options.headers['x-portkey-provider'].
   * @example `await inference.cancelBatch('resource-id');`
   */
  async cancelBatch(
    batch_id: string,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceBatch> {
    return request<GatewayInferenceBatch>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/batches/${gatewayPathSegment(batch_id)}/cancel`,
      responseSchema: GatewayInferenceBatchSchema,
    });
  }

  /** POST /feedback. Verified on the explicit Prisma runtime endpoint with a runtime key, not SCM OAuth. No deletion API is declared; synthetic audit records may persist.
   * @example `await inference.createFeedback(body);`
   */
  async createFeedback(
    body: GatewayInferenceInputFeedbackRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceFeedbackResponse> {
    return request<GatewayInferenceFeedbackResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/feedback`,
      body,
      requestSchema: GatewayInferenceInputFeedbackRequestSchema,
      responseSchema: GatewayInferenceFeedbackResponseSchema,
    });
  }

  /** PUT /feedback/{id}. Explicit Prisma runtime endpoint/key only, not SCM OAuth. Successful response shapes are upstream contracts, not live-certified in this tenant.
   * Uses the declared PUT operation, not the inconsistent POST curl sample. No automatic retry by default.
   * @experimental Confirmed runtime handler; owned-record PUT returns HTTP 500 because feedback lookup requires uninitialized ClickHouse in control-plane storage mode. Typed contracts are experimental, not a successful live update. Outside stability guarantees until live-verified.
   * @example `await inference.updateFeedback('550e8400-e29b-41d4-a716-446655440000', body);`
   */
  async updateFeedback(
    id: string,
    body: GatewayInferenceInputFeedbackUpdateRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceFeedbackResponse> {
    assertUuid(id, 'feedbackId');
    return request<GatewayInferenceFeedbackResponse>({
      ...this.runtimeRequestOptions(options),
      method: 'PUT',
      path: `/feedback/${gatewayPathSegment(id)}`,
      body,
      requestSchema: GatewayInferenceInputFeedbackUpdateRequestSchema,
      responseSchema: GatewayInferenceFeedbackResponseSchema,
    });
  }

  /** POST /logs. Verified on the explicit Prisma runtime endpoint with a runtime key, not SCM OAuth. No deletion API is declared; synthetic audit records may persist.
   * @example `await inference.createLogs(body);`
   */
  async createLogs(
    body: GatewayInferenceInputCreateLogsRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<string> {
    return request<string>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/logs`,
      body,
      requestSchema: GatewayInferenceInputCreateLogsRequestSchema,
      responseType: 'text',
    });
  }

  /** GET /logs/{logId}. Explicit Prisma runtime endpoint/key only, not SCM OAuth. Successful response shapes are upstream contracts, not live-certified in this tenant.
   * v2 storage paths require an ISO timestamp with a timezone; omit type for ordinary logs. Log bodies may contain sensitive data and are always omitted from SDK debug output.
   * @experimental Confirmed runtime handler; owned-log reads return HTTP 500 because the deployed handler has no control-plane storage branch. Typed contracts and v2 timestamp validation are experimental, not successful live retrieval. Outside stability guarantees until live-verified.
   * @example `await inference.getLog('resource-id', {});`
   */
  async getLog(
    logId: string,
    opts: GatewayInferenceInputGetLogQuery = {},
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceLogObject> {
    return request<GatewayInferenceLogObject>({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: `/logs/${gatewayPathSegment(logId)}`,
      params: queryParams(opts, GatewayInferenceInputGetLogQuerySchema),
      responseSchema: GatewayInferenceLogObjectSchema,
    });
  }
}
