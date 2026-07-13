// Bearer-token verification middleware for Okta / Google Workspace, and a
// `none` mode for local development.
//
// The browser sends `Authorization: Bearer <session token>` (see the app's
// HttpStorageAdapter `getToken`). This middleware validates that token as an
// OIDC JWT against the provider's JWKS before any request touches the database.
//
// AUTH_MODE:
//   okta   — verify a JWT issued by your Okta org (OIDC_ISSUER + OIDC_AUDIENCE)
//   google — verify a Google Workspace ID token (issuer https://accounts.google.com)
//   none   — DEV ONLY: skip verification, treat everyone as an anonymous user
//
// Uses `jose` (npm i jose) for JWKS fetching + JWT verification.

import { createRemoteJWKSet, jwtVerify } from 'jose';

const MODE = process.env.AUTH_MODE ?? 'none';

function makeVerifier() {
  if (MODE === 'none') {
    return async () => ({ sub: 'anonymous', mode: 'none' });
  }

  if (MODE === 'okta') {
    const issuer = required('OIDC_ISSUER');       // e.g. https://acme.okta.com/oauth2/default
    const audience = required('OIDC_AUDIENCE');   // e.g. api://lifecycle-map
    const jwks = createRemoteJWKSet(new URL(`${issuer}/v1/keys`));
    return async (token) => {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience });
      return payload;
    };
  }

  if (MODE === 'google') {
    // Google Workspace ID tokens. Set OIDC_AUDIENCE to your OAuth client id.
    const issuer = 'https://accounts.google.com';
    const audience = required('OIDC_AUDIENCE');
    const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
    return async (token) => {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience });
      // Optionally restrict to your workspace domain:
      if (process.env.GOOGLE_HD && payload.hd !== process.env.GOOGLE_HD) {
        throw new Error(`Wrong Google Workspace domain: ${payload.hd}`);
      }
      return payload;
    };
  }

  throw new Error(`Unknown AUTH_MODE: ${MODE}`);
}

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name} for AUTH_MODE=${MODE}`);
  return v;
}

const verify = makeVerifier();

/** Express middleware: verifies the bearer token and attaches req.user. */
export async function authMiddleware(req, res, next) {
  try {
    if (MODE === 'none') {
      req.user = { sub: 'anonymous' };
      return next();
    }
    const header = req.headers.authorization ?? '';
    const match = /^Bearer (.+)$/.exec(header);
    if (!match) return res.status(401).json({ error: 'Missing bearer token' });
    req.user = await verify(match[1]);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token', detail: String(e?.message ?? e) });
  }
}

export const AUTH_MODE = MODE;
