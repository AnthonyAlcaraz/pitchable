#!/usr/bin/env node
/**
 * Upload locally generated showcase images to R2 via the deployed API.
 *
 * Usage:
 *   node scripts/upload-showcase-to-r2.mjs
 *
 * Requires: JWT token from login (auto-obtained via API).
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

const API_BASE = 'https://pitch-able.ai';
const MARP_DIR = path.join(process.env.TEMP || '/tmp', 'pitchable-showcase', 'marp');

// Login to get JWT
async function login() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      email: 'pro-test@pitchable.ai',
      password: 'ProTest1234',
    });
    const req = https.request(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200 && res.statusCode !== 201) {
          reject(new Error(`Login failed: ${res.statusCode} ${data}`));
          return;
        }
        try {
          const json = JSON.parse(data);
          resolve(json.tokens?.accessToken || json.access_token || json.token);
        } catch (e) {
          reject(new Error(`Login parse error: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Upload a single image
async function uploadImage(token, themeSlug, slideNumber, filePath) {
  const data = fs.readFileSync(filePath).toString('base64');
  const body = JSON.stringify({ themeSlug, slideNumber, data });

  return new Promise((resolve, reject) => {
    const req = https.request(`${API_BASE}/admin/showcase/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let respData = '';
      res.on('data', c => respData += c);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(respData));
        } else {
          reject(new Error(`Upload failed ${res.statusCode}: ${respData}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // Discover all theme JPEGs
  const files = fs.readdirSync(MARP_DIR).filter(f => f.endsWith('.jpeg'));
  const uploads = [];
  for (const file of files) {
    const match = file.match(/^(.+)\.(\d{3})\.jpeg$/);
    if (!match) continue;
    uploads.push({
      themeSlug: match[1],
      slideNumber: parseInt(match[2], 10),
      filePath: path.join(MARP_DIR, file),
    });
  }

  console.log(`Found ${uploads.length} showcase images to upload`);

  // Login
  console.log('Logging in...');
  const token = await login();
  console.log('Authenticated');

  // Upload sequentially (avoid overloading)
  let success = 0;
  let failed = 0;
  for (const { themeSlug, slideNumber, filePath } of uploads) {
    try {
      await uploadImage(token, themeSlug, slideNumber, filePath);
      success++;
      process.stdout.write(`\r  Uploaded: ${success}/${uploads.length}`);
    } catch (err) {
      failed++;
      console.error(`\n  FAILED: ${themeSlug}/${slideNumber}: ${err.message}`);
    }
  }

  console.log(`\n\nDone: ${success} uploaded, ${failed} failed`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
