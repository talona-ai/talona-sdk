# Contributing

Thanks for helping improve the Talona TypeScript SDK.

## Development

Requirements:

- Node.js 20 or newer
- npm 10 or newer

```sh
git clone https://github.com/talona-ai/talona-sdk.git
cd talona-sdk
npm ci
npm run check
```

Use `npm run test:watch` while developing and `npm run format` before committing. Add tests for behavior changes and keep the public API backward compatible within a major version.

## Pull requests

- Create a focused branch from `main`.
- Use a conventional commit such as `feat(browser): add session labels`.
- Explain user-visible behavior and testing in the pull request.
- Update the README or Browser API guide when the public interface changes.
- Add an entry under `Unreleased` in the changelog.

## Releases

Maintainers publish from a GitHub release. Before the first npm release, configure an npm trusted publisher for:

- Package: `@talona/sdk`
- Organization or user: `talona-ai`
- Repository: `talona-sdk`
- Workflow: `publish.yml`

The publish workflow uses GitHub's OIDC identity and does not require a long-lived npm token. Release tags must match the version in `package.json` (for example, `v0.1.0`).
