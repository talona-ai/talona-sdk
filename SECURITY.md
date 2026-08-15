# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use [GitHub's private vulnerability reporting](https://github.com/talona-ai/talona-sdk/security/advisories/new) so the Talona team can investigate it safely.

Include the affected SDK version, impact, reproduction steps, and any suggested mitigation. We will acknowledge the report as soon as possible and coordinate disclosure after a fix is available.

## API key safety

Talona API keys grant access to your account. Keep them in a secret manager or server-side environment variable. Never commit a key, include it in client-side JavaScript, or log request headers and CDP URLs.
