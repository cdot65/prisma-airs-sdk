import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { request } from '../../src/http/request.js';
import { ErrorType } from '../../src/errors.js';

const spec = {
  method: 'GET' as const,
  baseUrl: 'https://gateway.test',
  path: '/file',
  numRetries: 0,
  auth: { prepare: async (value: never) => value },
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe('runtime transport ownership', () => {
  it('normalizes failed binary reads without exposing their error contents', async () => {
    const response = new Response();
    vi.spyOn(response, 'arrayBuffer').mockRejectedValue(new Error('private response detail'));
    await expect(
      request({ ...spec, responseType: 'bytes', fetch: vi.fn(async () => response) } as never),
    ).rejects.toMatchObject({
      errorType: ErrorType.CLIENT_SIDE_ERROR,
      failureKind: 'network',
      statusCode: 200,
    });
  });
  it('honors cancellation during a binary read', async () => {
    const controller = new AbortController();
    const response = new Response();
    const reason = new Error('stop binary');
    vi.spyOn(response, 'arrayBuffer').mockImplementation(() => {
      controller.abort(reason);
      return new Promise(() => {});
    });
    await expect(
      request({
        ...spec,
        responseType: 'bytes',
        signal: controller.signal,
        fetch: vi.fn(async () => response),
      } as never),
    ).rejects.toBe(reason);
  });
  it('validates multipart input before invoking its encoder or authentication', async () => {
    const prepare = vi.fn();
    const encodeFormData = vi.fn();
    await expect(
      request({
        ...spec,
        method: 'POST',
        body: { file: 'bad' },
        requestSchema: z.object({ file: z.instanceof(Blob) }),
        encodeFormData,
        auth: { prepare },
      }),
    ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
    expect(encodeFormData).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
  });
  it('never clones streaming inference bodies for debug logging, even when body debug is enabled', async () => {
    vi.stubEnv('PANW_AI_SEC_DEBUG', '1');
    vi.stubEnv('PANW_AI_SEC_DEBUG_BODY', '1');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = new Response();
    const clone = vi.spyOn(response, 'clone');
    const value = await request({
      ...spec,
      omitDebugBody: true,
      fetch: vi.fn(async () => response),
      streamResponse: (_response, _signal, dispose) => {
        dispose();
        return 'stream';
      },
    } as never);
    expect(value).toBe('stream');
    expect(clone).not.toHaveBeenCalled();
  });
});
