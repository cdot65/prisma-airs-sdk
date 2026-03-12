// src/scan/content.ts — mirrors Python SDK scan/models/content.py

import { readFileSync } from 'node:fs';
import {
  MAX_CONTENT_PROMPT_LENGTH,
  MAX_CONTENT_RESPONSE_LENGTH,
  MAX_CONTENT_CONTEXT_LENGTH,
} from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import type { ToolEvent } from '../models/tool-event.js';
import type { ScanRequestContentsInner } from '../models/scan-request.js';

/** Options for constructing a {@link Content} instance. At least one field is required. */
export interface ContentOptions {
  /** User prompt text. Max 2 MB. */
  prompt?: string;
  /** AI model response text. Max 2 MB. */
  response?: string;
  /** Conversation context. Max 100 MB. */
  context?: string;
  /** Code prompt text. Max 2 MB. */
  codePrompt?: string;
  /** Code response text. Max 2 MB. */
  codeResponse?: string;
  /** Tool/function call event data. */
  toolEvent?: ToolEvent;
}

/**
 * Represents content to be scanned by AIRS.
 * Validates byte-length limits on construction and property assignment.
 */
export class Content {
  private _prompt?: string;
  private _response?: string;
  private _context?: string;
  private _codePrompt?: string;
  private _codeResponse?: string;
  private _toolEvent?: ToolEvent;

  /**
   * Create a new Content instance.
   * @param opts - Content fields; at least one of prompt, response, codePrompt, codeResponse, or toolEvent is required.
   * @throws {AISecSDKException} If no content field is provided or a field exceeds its byte-length limit.
   */
  constructor(opts: ContentOptions) {
    if (
      !opts.prompt &&
      !opts.response &&
      !opts.codePrompt &&
      !opts.codeResponse &&
      !opts.toolEvent
    ) {
      throw new AISecSDKException(
        'At least one of prompt, response, codePrompt, codeResponse, or toolEvent must be provided',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    if (opts.prompt !== undefined) this.prompt = opts.prompt;
    if (opts.response !== undefined) this.response = opts.response;
    if (opts.context !== undefined) this.context = opts.context;
    if (opts.codePrompt !== undefined) this.codePrompt = opts.codePrompt;
    if (opts.codeResponse !== undefined) this.codeResponse = opts.codeResponse;
    if (opts.toolEvent !== undefined) this._toolEvent = opts.toolEvent;
  }

  get prompt(): string | undefined {
    return this._prompt;
  }
  set prompt(value: string | undefined) {
    if (value !== undefined && Buffer.byteLength(value) > MAX_CONTENT_PROMPT_LENGTH) {
      throw new AISecSDKException(
        `prompt exceeds max length of ${MAX_CONTENT_PROMPT_LENGTH} bytes`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    this._prompt = value;
  }

  get response(): string | undefined {
    return this._response;
  }
  set response(value: string | undefined) {
    if (value !== undefined && Buffer.byteLength(value) > MAX_CONTENT_RESPONSE_LENGTH) {
      throw new AISecSDKException(
        `response exceeds max length of ${MAX_CONTENT_RESPONSE_LENGTH} bytes`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    this._response = value;
  }

  get context(): string | undefined {
    return this._context;
  }
  set context(value: string | undefined) {
    if (value !== undefined && Buffer.byteLength(value) > MAX_CONTENT_CONTEXT_LENGTH) {
      throw new AISecSDKException(
        `context exceeds max length of ${MAX_CONTENT_CONTEXT_LENGTH} bytes`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    this._context = value;
  }

  get codePrompt(): string | undefined {
    return this._codePrompt;
  }
  set codePrompt(value: string | undefined) {
    if (value !== undefined && Buffer.byteLength(value) > MAX_CONTENT_PROMPT_LENGTH) {
      throw new AISecSDKException(
        `codePrompt exceeds max length of ${MAX_CONTENT_PROMPT_LENGTH} bytes`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    this._codePrompt = value;
  }

  get codeResponse(): string | undefined {
    return this._codeResponse;
  }
  set codeResponse(value: string | undefined) {
    if (value !== undefined && Buffer.byteLength(value) > MAX_CONTENT_RESPONSE_LENGTH) {
      throw new AISecSDKException(
        `codeResponse exceeds max length of ${MAX_CONTENT_RESPONSE_LENGTH} bytes`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    this._codeResponse = value;
  }

  get toolEvent(): ToolEvent | undefined {
    return this._toolEvent;
  }
  set toolEvent(value: ToolEvent | undefined) {
    this._toolEvent = value;
  }

  /**
   * Total byte length of all text content fields.
   * @returns Combined byte length of all text content fields.
   */
  get length(): number {
    let total = 0;
    if (this._prompt) total += Buffer.byteLength(this._prompt);
    if (this._response) total += Buffer.byteLength(this._response);
    if (this._context) total += Buffer.byteLength(this._context);
    if (this._codePrompt) total += Buffer.byteLength(this._codePrompt);
    if (this._codeResponse) total += Buffer.byteLength(this._codeResponse);
    return total;
  }

  /**
   * Serialize to the API request format.
   * @returns The content as a scan request contents inner object.
   */
  toJSON(): ScanRequestContentsInner {
    const obj: ScanRequestContentsInner = {};
    if (this._prompt !== undefined) obj.prompt = this._prompt;
    if (this._response !== undefined) obj.response = this._response;
    if (this._context !== undefined) obj.context = this._context;
    if (this._codePrompt !== undefined) obj.code_prompt = this._codePrompt;
    if (this._codeResponse !== undefined) obj.code_response = this._codeResponse;
    if (this._toolEvent !== undefined) obj.tool_event = this._toolEvent;
    return obj;
  }

  /**
   * Create a Content instance from an API response object.
   * @param json - Scan request contents inner object.
   */
  static fromJSON(json: ScanRequestContentsInner): Content {
    return new Content({
      prompt: json.prompt,
      response: json.response,
      context: json.context,
      codePrompt: json.code_prompt,
      codeResponse: json.code_response,
      toolEvent: json.tool_event,
    });
  }

  /**
   * Load content from a JSON file.
   * @param filePath - Path to JSON file containing scan request contents.
   * @returns A new Content instance populated from the JSON file.
   */
  static fromJSONFile(filePath: string): Content {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed: ScanRequestContentsInner = JSON.parse(raw);
    return Content.fromJSON(parsed);
  }
}
