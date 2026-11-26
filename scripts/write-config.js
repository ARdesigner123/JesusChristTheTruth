#!/usr/bin/env node
// Vercel build step: writes static/js/config.js from environment variables.
//   SUPABASE_URL        e.g. https://abcdefgh.supabase.co
//   SUPABASE_ANON_KEY   the anon / publishable key (NEVER the service_role / secret key)
// If the variables are not set, the committed config.js is left untouched.
const fs = require('fs');
const path = require('path');

const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
const target = path.join(__dirname, '..', 'static', 'js', 'config.js');

if (!url || !key) {
    console.log('[write-config] SUPABASE_URL / SUPABASE_ANON_KEY not set — keeping static/js/config.js as committed.');
    process.exit(0);
}

function isSecretKey(k) {
    if (k.startsWith('sb_secret_')) return true;
    if (k.startsWith('eyJ')) {
        try {
            const payload = JSON.parse(Buffer.from(k.split('.')[1], 'base64').toString('utf8'));
            return payload.role === 'service_role';
        } catch (e) { return false; }
    }
    return false;
}
if (isSecretKey(key)) {
    console.error('[write-config] REFUSING TO BUILD: SUPABASE_ANON_KEY is a service_role/secret key. ' +
        'That key bypasses all security and must never be shipped to browsers. Use the anon / publishable key instead.');
    process.exit(1);
}
if (!/^https:\/\/[^/]+$/.test(url.replace(/\/+$/, ''))) {
    console.error('[write-config] SUPABASE_URL should look like https://<project>.supabase.co');
    process.exit(1);
}

const out = `// Generated at build time by scripts/write-config.js — do not edit on the server.
window.JCT_CONFIG = {
    SUPABASE_URL: ${JSON.stringify(url.replace(/\/+$/, ''))},
    SUPABASE_ANON_KEY: ${JSON.stringify(key)}
};
`;
fs.writeFileSync(target, out);
console.log('[write-config] Wrote static/js/config.js for', url);
