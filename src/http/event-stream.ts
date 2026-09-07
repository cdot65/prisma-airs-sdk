import type { z } from 'zod';
import { AISecSDKException, ErrorType } from '../errors.js';
import { abortable } from './abort.js';

/** A single-consumer event stream. Breaking iteration or calling cancel releases the connection.
 * @example `for await (const chunk of stream) console.log(chunk);`
 */
export interface GatewayStream<T> extends AsyncIterableIterator<T> {
  /** Cancel even if iteration has not started.
   * @example `await stream.cancel();`
   */
  cancel(reason?: unknown): Promise<void>;
}

/** @internal Parse SSE incrementally with bounded frames and explicit connection ownership. */
export function createEventStream<T>(
  response: Response,
  schema: z.ZodType<T>,
  signal: AbortSignal,
  dispose: () => void,
  options: { maxEventBytes?: number; isTerminal?: (event: T) => boolean } = {},
): GatewayStream<T> {
  const maxEventBytes = options.maxEventBytes ?? 1_048_576;
  if (!Number.isSafeInteger(maxEventBytes) || maxEventBytes < 1)
    throw new AISecSDKException(
      'maxEventBytes must be a positive integer',
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  if (
    !response.headers.get('content-type')?.toLowerCase().startsWith('text/event-stream') ||
    !response.body
  ) {
    void response.body?.cancel().catch(() => {});
    throw new AISecSDKException(
      'Expected a text/event-stream response body',
      ErrorType.RESPONSE_VALIDATION,
    );
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '';
  let data: string[] = [];
  let eventName = '';
  let eventBytes = 0;
  let skipLf = false;
  let ended = false;
  let closed = false;
  let failed = false;
  let failure: unknown;
  let tail = Promise.resolve();
  const done: IteratorResult<T> = { done: true, value: undefined };

  const close = (reason?: unknown): void => {
    if (closed) return;
    closed = true;
    signal.removeEventListener('abort', onAbort);
    // A misbehaving cancel hook must not park a CLI or delay deadline cleanup.
    void reader.cancel(reason).catch(() => {});
    reader.releaseLock();
    buffer = '';
    data = [];
    dispose();
  };
  const onAbort = () => {
    failed = true;
    failure = signal.reason;
    close(failure);
  };
  if (signal.aborted) onAbort();
  else signal.addEventListener('abort', onAbort, { once: true });

  async function nextEvent(): Promise<IteratorResult<T>> {
    if (failed) throw failure;
    if (closed) return done;
    try {
      for (;;) {
        signal.throwIfAborted();
        if (skipLf && buffer.length) {
          if (buffer[0] === '\n') buffer = buffer.slice(1);
          skipLf = false;
        }
        const delimiter = buffer.search(/[\r\n]/);
        if (delimiter === -1) {
          if (eventBytes + Buffer.byteLength(buffer, 'utf8') > maxEventBytes)
            throw new AISecSDKException(
              'SSE event exceeded maxEventBytes',
              ErrorType.RESPONSE_VALIDATION,
            );
          if (ended) {
            throw new AISecSDKException(
              'Event stream ended before its terminator',
              ErrorType.RESPONSE_VALIDATION,
            );
          }
          let chunk: Awaited<ReturnType<typeof reader.read>>;
          try {
            chunk = await abortable(reader.read(), signal);
          } catch {
            if (signal.aborted) throw signal.reason;
            throw new AISecSDKException(
              'Failed to read event stream',
              ErrorType.CLIENT_SIDE_ERROR,
              { failureKind: 'network', statusCode: response.status },
            );
          }
          if (closed) {
            if (failed) throw failure;
            return done;
          }
          ended = chunk.done;
          try {
            buffer += decoder.decode(chunk.value, { stream: !ended });
          } catch {
            throw new AISecSDKException(
              'Event stream is not valid UTF-8',
              ErrorType.RESPONSE_VALIDATION,
            );
          }
          continue;
        }
        const line = buffer.slice(0, delimiter);
        skipLf = buffer[delimiter] === '\r';
        buffer = buffer.slice(delimiter + 1);
        eventBytes += Buffer.byteLength(line, 'utf8') + 1;
        if (eventBytes > maxEventBytes)
          throw new AISecSDKException(
            'SSE event exceeded maxEventBytes',
            ErrorType.RESPONSE_VALIDATION,
          );
        if (line === '') {
          const payload = data.join('\n');
          const name = eventName;
          data = [];
          eventName = '';
          eventBytes = 0;
          if (!payload) continue;
          if (payload === '[DONE]') {
            if (options.isTerminal)
              throw new AISecSDKException(
                'Event stream ended before its typed terminator',
                ErrorType.RESPONSE_VALIDATION,
              );
            close();
            return done;
          }
          if (name === 'error')
            throw new AISecSDKException(
              'Gateway returned an error event',
              ErrorType.SERVER_SIDE_ERROR,
            );
          let value: unknown;
          try {
            value = JSON.parse(payload);
          } catch {
            throw new AISecSDKException(
              'Event data is not valid JSON',
              ErrorType.RESPONSE_VALIDATION,
            );
          }
          if (value && typeof value === 'object' && 'error' in value && value.error)
            throw new AISecSDKException(
              'Gateway returned an error event',
              ErrorType.SERVER_SIDE_ERROR,
            );
          const parsed = schema.safeParse(value);
          if (!parsed.success)
            throw new AISecSDKException(
              `Event data did not match the response schema: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.code}`).join('; ')}`,
              ErrorType.RESPONSE_VALIDATION,
            );
          // Responses uses a typed terminal event rather than the chat [DONE] sentinel.
          // Return that final event to the consumer, then release the socket immediately.
          if (options.isTerminal?.(parsed.data)) close();
          return { done: false, value: parsed.data };
        }
        if (line.startsWith(':')) continue;
        const colon = line.indexOf(':');
        const field = colon < 0 ? line : line.slice(0, colon);
        let value = colon < 0 ? '' : line.slice(colon + 1);
        if (value.startsWith(' ')) value = value.slice(1);
        if (field === 'data') data.push(value);
        if (field === 'event') eventName = value;
      }
    } catch (error) {
      failed = true;
      failure = signal.aborted ? signal.reason : error;
      close(failure);
      throw failure;
    }
  }

  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      // Serialize concurrent next() calls instead of corrupting decoder/frame state.
      const pending = tail.then(nextEvent);
      tail = pending.then(
        () => {},
        () => {},
      );
      return pending;
    },
    async return() {
      close();
      return done;
    },
    async throw(error?: unknown) {
      close(error);
      throw error;
    },
    async cancel(reason?: unknown) {
      close(reason);
    },
  };
}
