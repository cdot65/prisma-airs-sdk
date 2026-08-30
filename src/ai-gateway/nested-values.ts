import { AISecSDKException, ErrorType } from '../errors.js';
import {
  GatewayJsonObjectSchema,
  GatewayJsonValueSchema,
  type GatewayJsonObject,
  type GatewayJsonValue,
} from '../models/ai-gateway-routing.js';

/** One already-typed value assigned through a dotted/bracketed path. */
export interface GatewayDottedValueEntry {
  path: string;
  value: GatewayJsonValue;
}

type PathSegment = string | number;
type Container = GatewayJsonObject | GatewayJsonValue[];

const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);
const ESCAPABLE = new Set(['.', '[', ']', '\\']);

function invalid(message: string): never {
  throw new AISecSDKException(message, ErrorType.USER_REQUEST_PAYLOAD_ERROR);
}

function pushProperty(tokens: PathSegment[], value: string, path: string): void {
  if (!value) invalid(`Invalid dotted path: ${path}`);
  if (FORBIDDEN_SEGMENTS.has(value)) invalid(`Unsafe dotted path segment: ${value}`);
  tokens.push(value);
}

/** @internal Parse the public dotted/bracketed path grammar without evaluating input. */
function parsePath(path: string): PathSegment[] {
  if (!path) invalid('Dotted path must not be empty');

  const tokens: PathSegment[] = [];
  let property = '';
  let afterDot = false;
  let afterIndex = false;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (char === '\\') {
      const escaped = path[++i];
      if (escaped === undefined || !ESCAPABLE.has(escaped)) {
        invalid(`Invalid escape in dotted path: ${path}`);
      }
      if (afterIndex) invalid(`Missing dot after array index in path: ${path}`);
      property += escaped;
      afterDot = false;
      continue;
    }

    if (char === '.') {
      if (property) {
        pushProperty(tokens, property, path);
        property = '';
      } else if (!afterIndex) {
        invalid(`Invalid empty segment in dotted path: ${path}`);
      }
      afterDot = true;
      afterIndex = false;
      continue;
    }

    if (char === '[') {
      if (afterDot) invalid(`Invalid array segment in dotted path: ${path}`);
      if (property) {
        pushProperty(tokens, property, path);
        property = '';
      } else if (tokens.length === 0) {
        invalid(`Dotted paths must start with an object property: ${path}`);
      }

      const close = path.indexOf(']', i + 1);
      if (close === -1) invalid(`Unclosed array index in dotted path: ${path}`);
      const rawIndex = path.slice(i + 1, close);
      if (!/^(0|[1-9]\d*)$/.test(rawIndex)) invalid(`Invalid array index in dotted path: ${path}`);
      tokens.push(Number(rawIndex));
      i = close;
      afterIndex = true;
      afterDot = false;
      continue;
    }

    if (char === ']') invalid(`Unexpected ] in dotted path: ${path}`);
    if (afterIndex) invalid(`Missing dot after array index in path: ${path}`);
    property += char;
    afterDot = false;
  }

  if (property) pushProperty(tokens, property, path);
  else if (afterDot) invalid(`Dotted path must not end with a dot: ${path}`);
  if (tokens.length === 0) invalid(`Invalid dotted path: ${path}`);
  return tokens;
}

function isContainerFor(value: GatewayJsonValue, expectArray: boolean): value is Container {
  return expectArray
    ? Array.isArray(value)
    : typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSegment(container: Container, segment: PathSegment): GatewayJsonValue {
  return typeof segment === 'number'
    ? (container as GatewayJsonValue[])[segment]
    : (container as GatewayJsonObject)[segment];
}

function writeSegment(container: Container, segment: PathSegment, value: GatewayJsonValue): void {
  if (typeof segment === 'number') (container as GatewayJsonValue[])[segment] = value;
  else (container as GatewayJsonObject)[segment] = value;
}

function assign(
  root: GatewayJsonObject,
  tokens: PathSegment[],
  value: GatewayJsonValue,
  replaceExisting: boolean,
): void {
  let current: Container = root;

  for (let i = 0; i < tokens.length; i++) {
    const segment = tokens[i];
    const final = i === tokens.length - 1;

    if (typeof segment === 'number' && !Array.isArray(current)) {
      invalid('Array index conflicts with an object path');
    }
    if (typeof segment === 'string' && Array.isArray(current)) {
      invalid('Object property conflicts with an array path');
    }

    const hasValue = Object.prototype.hasOwnProperty.call(current, segment);
    if (final) {
      if (hasValue && !replaceExisting) invalid('Duplicate dotted path');
      writeSegment(current, segment, value);
      return;
    }

    const expectArray = typeof tokens[i + 1] === 'number';
    if (!hasValue) {
      writeSegment(current, segment, expectArray ? [] : {});
    } else {
      const existing = readSegment(current, segment);
      if (!isContainerFor(existing, expectArray)) invalid('Dotted path shape conflict');
    }
    current = readSegment(current, segment) as Container;
  }
}

function assertDenseArrays(value: GatewayJsonValue): void {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(value, i))
        invalid('Sparse arrays are not supported');
      assertDenseArrays(value[i]);
    }
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const nested of Object.values(value)) assertDenseArrays(nested);
  }
}

function cloneJson<T extends GatewayJsonValue>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneJson(item)) as T;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneJson(item)]),
    ) as T;
  }
  return value;
}

function parseJsonValue(value: unknown): GatewayJsonValue {
  const result = GatewayJsonValueSchema.safeParse(value);
  if (!result.success) invalid('Dotted value must be finite JSON');
  return cloneJson(result.data);
}

/**
 * Build a new JSON object from typed dotted-path entries.
 *
 * @example
 * ```ts
 * import { buildDottedObject } from '@cdot65/prisma-airs-sdk';
 *
 * const config = buildDottedObject([
 *   { path: 'retry.attempts', value: 3 },
 *   { path: 'targets[0].provider', value: '@vertex-primary' },
 * ]);
 * // { retry: { attempts: 3 }, targets: [{ provider: '@vertex-primary' }] }
 * ```
 */
export function buildDottedObject(entries: readonly GatewayDottedValueEntry[]): GatewayJsonObject {
  const parsed = entries.map((entry) => ({
    tokens: parsePath(entry.path),
    value: parseJsonValue(entry.value),
  }));
  const identities = new Set<string>();
  for (const entry of parsed) {
    const identity = JSON.stringify(entry.tokens);
    if (identities.has(identity)) invalid('Duplicate dotted path');
    identities.add(identity);
  }

  const result: GatewayJsonObject = {};
  for (const entry of parsed) assign(result, entry.tokens, entry.value, false);
  assertDenseArrays(result);
  return result;
}

/**
 * Return an immutable JSON clone with one dotted-path value set or replaced.
 *
 * @example
 * ```ts
 * import { setDottedValue } from '@cdot65/prisma-airs-sdk';
 *
 * const original = { retry: { attempts: 2 } };
 * const updated = setDottedValue(original, 'retry.attempts', 5);
 * // original.retry.attempts === 2; updated.retry.attempts === 5
 * ```
 */
export function setDottedValue(
  input: GatewayJsonObject,
  path: string,
  value: GatewayJsonValue,
): GatewayJsonObject {
  const parsedInput = GatewayJsonObjectSchema.safeParse(input);
  if (!parsedInput.success) invalid('Input must be a finite JSON object');
  const result = cloneJson(parsedInput.data);
  assign(result, parsePath(path), parseJsonValue(value), true);
  assertDenseArrays(result);
  return result;
}
