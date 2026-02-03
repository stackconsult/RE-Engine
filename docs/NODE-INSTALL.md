# Node.js Install (Required)

Your current machine does not have `node` or `npm` on PATH.

The RE Engine TypeScript + Playwright stack requires Node.js **v22+**.

## Recommended (nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# restart terminal
nvm install 22
nvm use 22
node -v
npm -v
```

## Homebrew

```bash
brew install node@22
node -v
npm -v
```

## Verify

```bash
node -v
npm -v
bash scripts/dev/bootstrap.sh
bash scripts/ops/run-smoke.sh
```
