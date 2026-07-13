import { simpleGit, SimpleGit } from 'simple-git';
import { getOctokit, withRateLimitHandling } from '../utils/github';
import { scanFileContent } from '../utils/scanner';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import os from 'os';
import readline from 'readline';

interface FixOptions {
  repo: string;
  yes?: boolean;
}

const askConfirmation = (question: string): Promise<boolean> => {
  const rl = readline.createInterface({
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

export const fixCommand = async (oldUsername: string, newUsername: string, options: FixOptions) => {
  const [owner, repo] = options.repo.split('/');
  if (!owner || !repo) {
    console.error(chalk.red('Error: --repo must be in the format owner/repo'));
    process.exit(1);
  }

  const octokit = getOctokit();

  // 1. Get repo info to find default branch
  console.log(chalk.blue(`Fetching repository info for ${owner}/${repo}...`));
  let defaultBranch = 'main';
  try {
    const repoInfo = await withRateLimitHandling(() => octokit.repos.get({ owner, repo }));
    defaultBranch = repoInfo.data.default_branch;
  } catch (error: any) {
    console.error(chalk.red(`Failed to fetch repo info: ${error.message}`));
    process.exit(1);
  }

  // 2. Clone repo locally to a temp dir
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `ghwatch-${repo}-`));
  console.log(chalk.gray(`Cloning into temporary directory: ${tempDir}`));
  
  const git: SimpleGit = simpleGit();
  const token = process.env.GITHUB_TOKEN;
  const remoteUrl = `https://${token}@github.com/${owner}/${repo}.git`;

  try {
    await git.clone(remoteUrl, tempDir);
  } catch (error: any) {
    console.error(chalk.red(`Failed to clone repository: ${error.message}`));
    process.exit(1);
  }

  const repoGit = simpleGit(tempDir);
  const branchName = `fix/username-update-${Date.now()}`;

  // 3. Create branch
  await repoGit.checkoutLocalBranch(branchName);

  // 4. Scan and fix local files
  console.log(chalk.blue('Scanning local files and applying fixes...'));
  
  const getAllFiles = (dir: string, fileList: string[] = []): string[] => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === '.git' || file === 'node_modules') continue;
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        getAllFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    }
    return fileList;
  };

  const localFiles = getAllFiles(tempDir);
  let filesModified = 0;

  for (const filePath of localFiles) {
    const relativePath = path.relative(tempDir, filePath);
    const lowerPath = relativePath.toLowerCase();

    if (
      !(
        lowerPath.includes('readme') ||
        lowerPath.endsWith('package.json') ||
        lowerPath.endsWith('pyproject.toml') ||
        lowerPath.endsWith('cargo.toml') ||
        lowerPath.endsWith('go.mod') ||
        lowerPath.includes('codeowners') ||
        (lowerPath.includes('.github/workflows/') && (lowerPath.endsWith('.yml') || lowerPath.endsWith('.yaml'))) ||
        lowerPath.endsWith('.md')
      )
    ) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const results = scanFileContent(relativePath, content, oldUsername);

    if (results.length > 0) {
      const escapedUsername = oldUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexPattern = new RegExp(`(?<![a-zA-Z0-9-])${escapedUsername}(?![a-zA-Z0-9-])`, 'gi');
      
      const newContent = content.replace(regexPattern, newUsername);
      fs.writeFileSync(filePath, newContent, 'utf8');
      filesModified++;
      console.log(chalk.green(`Fixed ${results.length} references in ${relativePath}`));
    }
  }

  if (filesModified === 0) {
    console.log(chalk.green(`No references to '${oldUsername}' found. Nothing to fix.`));
    return;
  }

  // 5. Confirm before pushing
  console.log(chalk.yellow(`\nModified ${filesModified} files.`));
  
  if (!options.yes) {
    if (!process.stdin.isTTY) {
      console.error(chalk.red('Error: Running in a non-interactive environment (e.g. CI) without the --yes flag. Aborting to prevent hanging.'));
      process.exit(1);
    }
    
    const confirmed = await askConfirmation(chalk.yellow('Do you want to commit, push, and open a PR? (y/N): '));
    if (!confirmed) {
      console.log(chalk.red('Aborted by user.'));
      return;
    }
  }

  // 6. Commit and Push
  console.log(chalk.blue('Committing and pushing changes...'));
  try {
    await repoGit.add('./*');
    await repoGit.commit(`chore: update references from ${oldUsername} to ${newUsername}`);
    await repoGit.push('origin', branchName);
  } catch (error: any) {
    console.error(chalk.red(`Failed to push changes: ${error.message}`));
    process.exit(1);
  }

  // 7. Open PR
  console.log(chalk.blue('Opening Pull Request...'));
  try {
    const pr = await withRateLimitHandling(() => octokit.pulls.create({
      owner,
      repo,
      title: `chore: update username references to ${newUsername}`,
      head: branchName,
      base: defaultBranch,
      body: `This PR automatically updates references to the old GitHub username \`${oldUsername}\` with the new username \`${newUsername}\` to prevent broken links and mitigate [supply-chain impersonation risks](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-your-personal-account/changing-your-github-username#about-username-changes).\n\nGenerated by \`ghwatch\`.`
    }));

    console.log(chalk.green(`\nSuccess! Pull Request opened: ${pr.data.html_url}`));
  } catch (error: any) {
    console.error(chalk.red(`Failed to open Pull Request: ${error.message}`));
    process.exit(1);
  }
};
