import { z } from 'zod';

/** Zod schema for OAuth client_id + customer_app request body. */
export const ClientIdAndCustomerAppSchema = z
  .object({
    client_id: z.string(),
    customer_app: z.string(),
  })
  .passthrough();

/** OAuth client_id and customer_app request body. */
export type ClientIdAndCustomerApp = z.infer<typeof ClientIdAndCustomerAppSchema>;

/** Zod schema for OAuth2 token response. */
export const Oauth2TokenSchema = z
  .object({
    token_type: z.string().optional(),
    issued_at: z.string().optional(),
    client_id: z.string().optional(),
    access_token: z.string(),
    expires_in: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

/** OAuth2 token response. */
export type Oauth2Token = z.infer<typeof Oauth2TokenSchema>;
