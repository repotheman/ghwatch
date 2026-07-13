"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixCommand = void 0;
const simple_git_1 = require("simple-git");
const github_1 = require("../utils/github");
const scanner_1 = require("../utils/scanner");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const readline_1 = __importDefault(require("readline"));
const askConfirmation = (question) => {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
};
const fixCommand = async (oldUsername, newUsername, options) => {
    const [owner, repo] = options.repo.split('/');
    if (!owner || !repo) {
        console.error(chalk_1.default.red('Error: --repo must be in the format owner/repo'));
        process.exit(1);
    }
    const octokit = (0, github_1.getOctokit)();
    // 1. Get repo info to find default branch
    console.log(chalk_1.default.blue(`Fetching repository info for ${owner}/${repo}...`));
    let defaultBranch = 'main';
    try {
        const repoInfo = await (0, github_1.withRateLimitHandling)(() => octokit.repos.get({ owner, repo }));
        defaultBranch = repoInfo.data.default_branch;
    }
    catch (error) {
        console.error(chalk_1.default.red(`Failed to fetch repo info: ${error.message}`));
        process.exit(1);
    }
    // 2. Clone repo locally to a temp dir
    const tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), `ghwatch-${repo}-`));
    console.log(chalk_1.default.gray(`Cloning into temporary directory: ${tempDir}`));
    const git = (0, simple_git_1.simpleGit)();
    const token = process.env.GITHUB_TOKEN;
    const remoteUrl = `https://${token}@github.com/${owner}/${repo}.git`;
    try {
        await git.clone(remoteUrl, tempDir);
    }
    catch (error) {
        console.error(chalk_1.default.red(`Failed to clone repository: ${error.message}`));
        process.exit(1);
    }
    const repoGit = (0, simple_git_1.simpleGit)(tempDir);
    const branchName = `fix/username-update-${Date.now()}`;
    // 3. Create branch
    await repoGit.checkoutLocalBranch(branchName);
    // 4. Scan and fix local files
    console.log(chalk_1.default.blue('Scanning local files and applying fixes...'));
    const getAllFiles = (dir, fileList = []) => {
        const files = fs_1.default.readdirSync(dir);
        for (const file of files) {
            if (file === '.git' || file === 'node_modules')
                continue;
            const filePath = path_1.default.join(dir, file);
            if (fs_1.default.statSync(filePath).isDirectory()) {
                getAllFiles(filePath, fileList);
            }
            else {
                fileList.push(filePath);
            }
        }
        return fileList;
    };
    const localFiles = getAllFiles(tempDir);
    let filesModified = 0;
    for (const filePath of localFiles) {
        const relativePath = path_1.default.relative(tempDir, filePath);
        const lowerPath = relativePath.toLowerCase();
        if (!(lowerPath.includes('readme') ||
            lowerPath.endsWith('package.json') ||
            lowerPath.endsWith('pyproject.toml') ||
            lowerPath.endsWith('cargo.toml') ||
            lowerPath.endsWith('go.mod') ||
            lowerPath.includes('codeowners') ||
            (lowerPath.includes('.github/workflows/') && (lowerPath.endsWith('.yml') || lowerPath.endsWith('.yaml'))) ||
            lowerPath.endsWith('.md'))) {
            continue;
        }
        const content = fs_1.default.readFileSync(filePath, 'utf8');
        const results = (0, scanner_1.scanFileContent)(relativePath, content, oldUsername);
        if (results.length > 0) {
            const escapedUsername = oldUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regexPattern = new RegExp(`(?<![a-zA-Z0-9-])${escapedUsername}(?![a-zA-Z0-9-])`, 'gi');
            const newContent = content.replace(regexPattern, newUsername);
            fs_1.default.writeFileSync(filePath, newContent, 'utf8');
            filesModified++;
            console.log(chalk_1.default.green(`Fixed ${results.length} references in ${relativePath}`));
        }
    }
    if (filesModified === 0) {
        console.log(chalk_1.default.green(`No references to '${oldUsername}' found. Nothing to fix.`));
        return;
    }
    // 5. Confirm before pushing
    console.log(chalk_1.default.yellow(`\nModified ${filesModified} files.`));
    if (!options.yes) {
        if (!process.stdin.isTTY) {
            console.error(chalk_1.default.red('Error: Running in a non-interactive environment (e.g. CI) without the --yes flag. Aborting to prevent hanging.'));
            process.exit(1);
        }
        const confirmed = await askConfirmation(chalk_1.default.yellow('Do you want to commit, push, and open a PR? (y/N): '));
        if (!confirmed) {
            console.log(chalk_1.default.red('Aborted by user.'));
            return;
        }
    }
    // 6. Commit and Push
    console.log(chalk_1.default.blue('Committing and pushing changes...'));
    try {
        await repoGit.add('./*');
        await repoGit.commit(`chore: update references from ${oldUsername} to ${newUsername}`);
        await repoGit.push('origin', branchName);
    }
    catch (error) {
        console.error(chalk_1.default.red(`Failed to push changes: ${error.message}`));
        process.exit(1);
    }
    // 7. Open PR
    console.log(chalk_1.default.blue('Opening Pull Request...'));
    try {
        const pr = await (0, github_1.withRateLimitHandling)(() => octokit.pulls.create({
            owner,
            repo,
            title: `chore: update username references to ${newUsername}`,
            head: branchName,
            base: defaultBranch,
            body: `This PR automatically updates references to the old GitHub username \`${oldUsername}\` with the new username \`${newUsername}\` to prevent broken links and mitigate [supply-chain impersonation risks](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-your-personal-account/changing-your-github-username#about-username-changes).\n\nGenerated by \`ghwatch\`.`
        }));
        console.log(chalk_1.default.green(`\nSuccess! Pull Request opened: ${pr.data.html_url}`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`Failed to open Pull Request: ${error.message}`));
        process.exit(1);
    }
};
exports.fixCommand = fixCommand;
