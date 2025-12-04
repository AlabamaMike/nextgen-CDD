#!/usr/bin/env tsx
/**
 * Generate Development JWT Token
 *
 * Usage: npx tsx scripts/generate-dev-token.ts
 */

import { createHmac } from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'development-secret-change-in-production';

const devUser = {
  id: 'dev-user-1',
  email: 'developer@localhost',
  name: 'Dev User',
  role: 'admin' as const,
  permissions: ['*']
};

// Create JWT manually
const header = { alg: 'HS256', typ: 'JWT' };
const now = Math.floor(Date.now() / 1000);
const payload = {
  ...devUser,
  iat: now,
  exp: now + (24 * 60 * 60) // 24 hours
};

const base64url = (str: string) =>
  Buffer.from(str).toString('base64url');

const headerB64 = base64url(JSON.stringify(header));
const payloadB64 = base64url(JSON.stringify(payload));
const signature = createHmac('sha256', JWT_SECRET)
  .update(`${headerB64}.${payloadB64}`)
  .digest('base64url');

const token = `${headerB64}.${payloadB64}.${signature}`;

console.log('\n=== Development JWT Token ===\n');
console.log('Token:', token);
console.log('\nUser:', devUser);
console.log('\nUsage:');
console.log('  export AUTH_TOKEN="' + token + '"');
console.log('  cd tui-client && npm run dev');
console.log('\nOr:');
console.log('  cd tui-client && npm run dev -- --token "' + token + '"');
console.log('\nOr with curl:');
console.log('  curl -H "Authorization: Bearer ' + token + '" http://localhost:3000/api/v1/engagements');
console.log('\nToken expires in 24 hours.\n');
