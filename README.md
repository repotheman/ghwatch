# ghwatch 👁️

[![npm version](https://img.shields.io/npm/v/ghwatch.svg)](https://npmjs.org/package/ghwatch)
[![License](https://img.shields.io/npm/l/ghwatch.svg)](https://github.com/ghwatch/ghwatch)
[![Downloads](https://img.shields.io/npm/dm/ghwatch.svg)](https://npmjs.org/package/ghwatch)

> **GitHub Username Change Auditor & Auto-Fixer**

## 🚨 The Supply-Chain Risk of Renaming Your Account

Have you recently changed your GitHub username? If so, GitHub redirects most of your old repository links automatically—but **ONLY** until someone else claims your old username. 

Once your old username is registered by a squatter, those redirects instantly break. This silently destroys your:
- README badges and documentation links
- `package.json` / `pyproject.toml` repository fields
- GitHub Actions CI configurations
- CODEOWNERS files
- Hardcoded URLs pointing to `raw.githubusercontent.com`

**Worst of all:** A malicious actor can claim your old username, recreate your repositories, and impersonate you, exposing your users to severe supply-chain attacks.

---

## What `ghwatch` Does

`ghwatch` is a robust CLI tool designed to protect you after a username change:
1. **Scans** your GitHub repositories for hidden references to your old username.
2. **Reports** broken references with exact file paths, line numbers, and severity levels.
3. **Auto-fixes** the references by automatically branching, committing, and opening Pull Requests that replace your old username with the new one.

<p align="center">
  <!-- Placeholder for asciinema demo GIF -->
  <img src="https://raw.githubusercontent.com/repotheman/ghwatch/main/demo.gif" alt="ghwatch demo" width="800">
</p>

## Installation & Usage

You can run `ghwatch` directly via `npx` without installing it globally!

### Prerequisites

You will need a GitHub Personal Access Token (PAT).
For safety, we recommend creating a fine-grained PAT scoped specifically to the repositories you want to audit and fix, with **Read & Write** access to `Contents` and `Pull Requests`.

```bash
export GITHUB_TOKEN="your_pat_here"
```

### 1. Scan for broken references

Find all references to your old username across all your repositories:

```bash
npx ghwatch scan <old-username> <new-username>
```

To scan a single repository:

```bash
npx ghwatch scan <old-username> <new-username> --repo <owner/repo>
```

### 2. Auto-Fix broken references

Once you've identified repositories that need fixing, run the `fix` command. This will securely clone the repository to a temporary directory, create a branch, apply precise string replacements, push, and open an auto-fix Pull Request.

```bash
npx ghwatch fix <old-username> <new-username> --repo <owner/repo>
```

*Note: By default, this command interactively prompts for confirmation before pushing any changes. In CI/CD environments, you must explicitly bypass the prompt using the `--yes` flag.*

## Severity Levels

- **Critical**: `package.json`, `CODEOWNERS`, CI configurations (`.yml`), and raw content links. These must be fixed immediately as they directly break package registries, permissions, or builds.
- **Medium**: `README.md` and other documentation files. Primarily affects links and badges.
- **Low**: Code comments or other generic references.

## License
ISC
