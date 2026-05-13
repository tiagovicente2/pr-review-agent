# Releases

Releases are built by GitHub Actions when a `v*` tag is pushed.

## Version bump

Update `package.json` with the next version and commit it:

```bash
git add package.json
git commit -m "chore: release v0.x.x"
```

## Create and push a tag

```bash
git tag v0.x.x
git push origin main
git push origin v0.x.x
```

The release workflow builds Linux, macOS, and Windows artifacts and attaches them to the GitHub release.

## Release title and notes

Use a title in this format:

```text
Release 0.x.x
```

Keep the release notes short and focused on the main user-facing changes.

Example:

```bash
gh release create v0.x.x \
  --title "Release 0.x.x" \
  --notes "Adds Codex support and improves review comment publishing."
```
