import { z } from 'zod';

/** Zod schema for an OAuth2 token response. */
export const OAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().optional(),
  expires_in: z.number(),
  scope: z.string().optional(),
});

/** OAuth2 token response with access token and expiry. */
export type OAuthTokenResponse = z.infer<typeof OAuthTokenResponseSchema>;
