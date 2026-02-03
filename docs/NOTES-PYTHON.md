# Python Note (macOS)

You are correct that Python is often needed in production stacks.

However, on this specific machine, the `python3` executable currently fails with:
`xcrun: error: active developer path ("/Library/Developer/CommandLineTools") does not exist`

This usually means Command Line Tools are not installed or `xcode-select` is misconfigured.

Fix (if you want system python working):
```bash
xcode-select --install
```

Workarounds:
- Use Node/TypeScript as primary runtime (what we’re doing).
- Use a standalone Python install (pyenv/homebrew/python) that does not depend on the missing CLT configuration.
