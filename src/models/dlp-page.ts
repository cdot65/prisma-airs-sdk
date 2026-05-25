import { z } from 'zod';

/**
 * Spring `Sort` descriptor. Returned inside every Spring `Page<T>` envelope.
 * All fields optional + passthrough for forward-compat.
 */
export const SortObjectSchema = z
  .object({
    empty: z.boolean().optional(),
    sorted: z.boolean().optional(),
    unsorted: z.boolean().optional(),
  })
  .passthrough();

export type SortObject = z.infer<typeof SortObjectSchema>;

/**
 * Spring `Pageable` descriptor — the current-page slice metadata returned
 * inside `Page<T>.pageable`.
 */
export const PageableObjectSchema = z
  .object({
    offset: z.number().optional(),
    pageNumber: z.number().optional(),
    pageSize: z.number().optional(),
    paged: z.boolean().optional(),
    unpaged: z.boolean().optional(),
    sort: SortObjectSchema.optional(),
  })
  .passthrough();

export type PageableObject = z.infer<typeof PageableObjectSchema>;

/**
 * Spring-style `Page<T>` envelope factory. Every DLP `/v2/api/*` list endpoint
 * wraps its results in this shape (`content[]` + pagination metadata).
 *
 * Returns a Zod schema parametrized on the inner item shape.
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { pageSchema } from '@cdot65/prisma-airs-sdk';
 *
 * const DataProfilePage = pageSchema(z.object({ id: z.string(), name: z.string() }));
 * const page = DataProfilePage.parse(apiResponse);
 * // page =>
 * // { content: [{ id: 'dp-1', name: 'SSN' }],
 * //   number: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true }
 * ```
 */
export function pageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z
    .object({
      content: z.array(itemSchema),
      empty: z.boolean().optional(),
      first: z.boolean().optional(),
      last: z.boolean().optional(),
      number: z.number().optional(),
      numberOfElements: z.number().optional(),
      pageable: PageableObjectSchema.optional(),
      size: z.number().optional(),
      sort: SortObjectSchema.optional(),
      totalElements: z.number().optional(),
      totalPages: z.number().optional(),
    })
    .passthrough();
}

/** Resolved type of a Spring `Page<T>` envelope for a given item schema. */
export type Page<T extends z.ZodTypeAny> = z.infer<ReturnType<typeof pageSchema<T>>>;
