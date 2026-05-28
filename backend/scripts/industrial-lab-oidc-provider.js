#!/usr/bin/env node
'use strict';

/**
 * IMPETUS Lab — Mock OIDC Provider (node port 8080)
 * Baseado em `oidc-provider` v9 (ESM-compatible via dynamic import).
 * Emite tokens para o tenant piloto: impetus-lab-client.
 * Corre como processo PM2: impetus-lab-oidc
 */

const PORT = parseInt(process.env.IMPETUS_LAB_OIDC_PORT || '8080', 10);
const OIDC_SECRET = process.env.IMPETUS_LAB_OIDC_SECRET || 'b744fc21b67eae282e04e9cc4d05d88044c5ef6910e51f6efd512cb11258d363';
const REDIRECT_URI = process.env.IMPETUS_FEDERATION_REDIRECT_URI || 'http://127.0.0.1:4000/api/federation/oidc/callback';

const LAB_USER = {
  sub: '21dd3cee-2efa-4936-908f-9ff1ba04e2a3',
  email: 'lab-user@impetus.local',
  name: 'IMPETUS Lab User',
  given_name: 'Lab',
  family_name: 'User',
};

async function main() {
  const { Provider } = await import('oidc-provider');

  const config = {
    clients: [
      {
        client_id: 'impetus-lab-client',
        client_secret: OIDC_SECRET,
        redirect_uris: [REDIRECT_URI],
        response_types: ['code'],
        grant_types: ['authorization_code', 'refresh_token'],
        scope: 'openid email profile',
        token_endpoint_auth_method: 'client_secret_basic',
      },
    ],
    pkce: { required: () => false },
    findAccount: async (_ctx, id) => ({
      accountId: id,
      async claims() {
        return { sub: id, ...LAB_USER };
      },
    }),
    features: {
      devInteractions: { enabled: true },
      introspection: { enabled: true },
      revocation: { enabled: true },
      resourceIndicators: { enabled: false },
    },
    cookies: {
      keys: [OIDC_SECRET],
      long: { signed: true, secure: false },
      short: { signed: true, secure: false },
    },
    jwks: {
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          alg: 'RS256',
          n: 'xiL6U_DdouFk4IQfmFCQHzeb4dJZLwDII3AnutJJRYChs79Qxs9kfgzfOemihM5braoSTsVOYrMXZ4oWcYAx17gQQN1PXmQ0Ql8vFAmYsFiDL-nvpaj7ey9mf7he7SsHssR5q9mxouz9aQ8pcJxOelDpzLg9NkGvS3QvvXS4EGMQvKXfHQHyu_pMZOu5pEfjPOgDStF-noYYxBOMAC5A52BUIm5Tm_AGmle7SX4PibDMaLPdrpBuK03q97zCB5eNrjB0pomOMbLnjn_1TRMcurwMGHiyES2y16xVIfGSbDy1rEnGm36xRK73fxtabz6IvHh-0HBa_TOBx3KkSNGNVQ',
          e: 'AQAB',
          d: 'Gxh7cpvqOLUUI4lN_M6_oX_sUbR_Z73L9jSx6jWJuaHT-zh65m_u2-IMwOcMx5ak05oCHkLolkzMMuefwW544nmUbMUXGTR2L8FujGdHjzjQ2pjmTJmlp9HyoB1pizYq5lfsv63p7KWg02DfF5GjQHeXkYcnL9KfE0rUoIG5Y4a7A-iFAQyzY5YpXUypKx1PhqtohxBw4CCDLlRulOOWJvxRgql25CQSNKIVz6aPJtl_G1JeQRUezbxu1PCW6EiyTACUGlwHCZBcYx_PbfsmeX2RY7JgdJF7pIDX-8tSrCSydOtVOjsS6KSJSEfK7C37VNE1ObmIAfj5px1TbzGgvQ',
          p: '6omsslt78XCaNWw6NTL5OcN8PL3teDMSULmey1nX5wYUlIQULeqlkWkbQLfWP6ZZdJT-SO_FHcx9WlC2ABUUeliAxFds7ljpb8teoFDN99G4aMbuHXYH3iVxD6U4lQwHSzxxRIVzMmJjhPE4HvG-j88CdpN9jmh_4Ssdelkj6J8',
          q: '2ESQIOUpI_jxZ9n8hcXB3u_oA4fOpsMCRNKHgKhBfRonQhSURzgJrJ1rN0BN4RTX1az0FOYneWIB0lunLWYtzhDtQpi1PW--7dnXqy2wMtJVS9uH96Ejccn-De5Z1tu1c3R9FvR-HnNUd2CVPzRP6cQOcssPrOrmFQQRc5QSYYs',
          dp: 'tQdpJg3ZAAXy8VNFJnTey4go59WNat64v1hWygzhye72iZ_c14grHa6sG2sKUvy6RXMPRwrS8eo5wzFTGYMr2DdhxKraaKp2HBU0R7e3ExZsKWuKtXC6J-xsdTAJGXo8UwUnREVhIj2xJRbvQ2tCtEuLUi0Ll5TvR8R4r0wInG8',
          dq: 'tnyEMX2szVHOQZdK4YYRJRDCcdgyo7yBOZl8BS_0sp9S6Qt8YuwCHclnIuP70yVHSmH6Q3hBbscoSlxUIJbLp8nYqg05QXH9Za4fsa2HtBqPJsdDX8x0oBuVaCPrYsVZwuZUdv4vPXqLl3_D7-UwWUy59FssCvja1HjuUNxs9ik',
          qi: 'BfBkkVM3QDkJ2ZbbNjW7sD1sfCxr5gwOHvkWxKec4JIQEQx6WTro7MWANwAQ2mOZogTeZgS_Kk6QpMdTkmqF419Nc_XoFxjgiUG34UnWlW1nBhv0K-VrVTx7RkTo9-UGPz-o2niEpwHyx70lMWjKMYAxugHFRRErxh-0R8Ep_Qk',
        },
      ],
    },
    interactions: {
      url(_ctx, interaction) {
        return `/interaction/${interaction.uid}`;
      },
    },
    scopes: ['openid', 'email', 'profile', 'offline_access'],
    claims: {
      openid: ['sub'],
      email: ['email', 'email_verified'],
      profile: ['name', 'given_name', 'family_name'],
    },
  };

  const oidc = new Provider(`http://127.0.0.1:${PORT}`, config);

  oidc.on('server_error', (_ctx, err) => {
    console.error('[LAB_OIDC] server_error:', err?.message);
  });

  const { createServer } = require('http');
  const server = createServer(oidc.callback());
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[LAB_OIDC_BOOT] {"event":"LAB_OIDC_BOOT","port":${PORT},"client":"impetus-lab-client","redirect":"${REDIRECT_URI}"}`);
  });
}

main().catch((err) => {
  console.error('[LAB_OIDC] fatal:', err?.message || err);
  process.exit(1);
});
