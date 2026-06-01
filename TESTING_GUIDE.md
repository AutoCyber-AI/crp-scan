# Testing CRP-Scan — Complete Guide

This guide covers all ways to test the CRP-Scan GitHub Action: locally,
in CI, and via a sample repository.

---

## 1. Quick local test (CLI)

The fastest way to verify CRP-Scan works is to run it locally on any
Python project:

```bash
# Install the package
pip install crprotocol

# Run on the current directory
python -m crp scan

# Expected output (on a project with no LLM code):
# Scanned X files — 0 findings.  ✓

# Run on a project that has direct OpenAI/Anthropic calls
# (to see real findings):
git clone https://github.com/AutoCyber-AI/context-relay-protocol
python -m crp scan --paths context-relay-protocol --format markdown
```

---

## 2. Test the Action in your own repo

### Step 1 — Add the workflow

Create `.github/workflows/crp-scan.yml` in your repository:

```yaml
name: CRP-Scan

on: [push, pull_request]

permissions:
  contents: read
  security-events: write

jobs:
  crp-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: AutoCyber-AI/crp-scan@v1
        with:
          fail-on: HIGH
          upload-sarif: true
          summary: true
```

### Step 2 — Enable Code Scanning

1. Go to your repo on GitHub
2. **Settings → Code security and analysis**
3. Enable **Code scanning** (free for public repos)

### Step 3 — Push and watch

```bash
git add .github/workflows/crp-scan.yml
git commit -m "ci: add CRP governance scan"
git push
```

4. Click **Actions** tab → open the **CRP-Scan** run
5. Check **step summary** for a markdown findings table
6. Click **Security → Code scanning alerts** to see SARIF findings

---

## 3. Trigger a real finding (smoke test)

Create a dummy file that intentionally triggers CRP001 (ungoverned LLM call):

```bash
cat > test_ungoverned.py << 'EOF'
import openai

client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}]
)
print(response.choices[0].message.content)
EOF
```

Now run locally:

```bash
python -m crp scan --paths . --format text
# Expected: CRP001 HIGH finding in test_ungoverned.py
```

Or push the file and the GitHub Action will detect it:

```bash
git add test_ungoverned.py
git commit -m "test: ungoverned LLM call (expect CRP001)"
git push
```

Check the Security tab → the finding should appear.

---

## 4. Verify SARIF output

```bash
# Generate a local SARIF file
python -m crp scan --sarif /tmp/results.sarif --format text .

# Inspect it
python -c "
import json, pathlib
s = json.loads(pathlib.Path('/tmp/results.sarif').read_text())
results = s['runs'][0]['results']
print(f'{len(results)} findings')
for r in results:
    rule = r.get('ruleId','?')
    loc  = r['locations'][0]['physicalLocation']
    path = loc['artifactLocation']['uri']
    line = loc['region']['startLine']
    msg  = r['message']['text'][:80]
    print(f'  {rule} {path}:{line}  {msg}')
"
```

---

## 5. Test with `act` (run Actions locally)

[act](https://github.com/nektos/act) lets you run GitHub Actions workflows
on your machine without pushing:

```bash
# Install act
brew install act          # macOS
choco install act-cli     # Windows

# Run the crp-scan workflow against the current repo
act push -W .github/workflows/crp-scan.yml \
  --secret GITHUB_TOKEN=$(gh auth token)

# Expect output like:
# [CRP-Scan Self-Test/self-scan]   Run CRP-Scan ...
# [CRP-Scan Self-Test/self-scan] ✅ Success
```

> **Note:** `act` requires Docker. The Action uses `ubuntu-latest` which
> maps to `catthehacker/ubuntu:act-latest` by default.

---

## 6. Expected outputs

### Findings table (markdown summary)

| Rule | Severity | File | Line | Description |
|------|----------|------|------|-------------|
| CRP001 | HIGH | src/llm.py | 12 | Ungoverned LLM call |
| CRP002 | MEDIUM | src/llm.py | 12 | No safety policy defined |

### Outputs in subsequent steps

```yaml
- name: Print results
  run: |
    echo "Findings: ${{ steps.crp.outputs.findings-count }}"
    echo "Severity: ${{ steps.crp.outputs.highest-severity }}"
```

### Non-zero exit code

The Action exits non-zero when `findings-count > 0` AND the highest
severity meets or exceeds `fail-on`. Check the red ✗ on the Actions run
page and adjust `fail-on` or fix the findings.

---

## 7. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `permission denied` uploading SARIF | Add `security-events: write` to workflow permissions |
| `crp: command not found` | The Action installs `crprotocol` automatically; ensure `python-version` is 3.9+ |
| No findings despite direct API calls | Check `paths` — defaults to `.`; ensure the scanned path contains the Python files |
| SARIF not visible in Security tab | Enable Code Scanning in repo Settings → Code security |
| Action fails with `ModuleNotFoundError` | Pin `crprotocol-version` to the latest stable release |

---

## 8. Reference links

- [crp scan CLI docs](https://github.com/AutoCyber-AI/context-relay-protocol)
- [GitHub Code Scanning docs](https://docs.github.com/en/code-security/code-scanning)
- [SARIF specification](https://sarifweb.azurewebsites.net/)
- [act — run Actions locally](https://github.com/nektos/act)
