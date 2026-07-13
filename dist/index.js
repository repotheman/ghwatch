#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const scan_1 = require("./commands/scan");
const fix_1 = require("./commands/fix");
const chalk_1 = __importDefault(require("chalk"));
const program = new commander_1.Command();
program
    .name('ghwatch')
    .description('GitHub Username Change Auditor & Auto-Fixer')
    .version('1.0.0');
program
    .command('scan')
    .description('Scan a user\'s GitHub repos for references to their OLD username')
    .argument('<old-username>', 'The old GitHub username to search for')
    .argument('<new-username>', 'The new GitHub username')
    .option('--repo <repo>', 'Scan a specific repository (e.g. owner/repo) instead of all owned repos')
    .option('--json', 'Output results in JSON format')
    .action(scan_1.scanCommand);
program
    .command('fix')
    .description('Open auto-fix PRs replacing old references with the new username')
    .argument('<old-username>', 'The old GitHub username to search for')
    .argument('<new-username>', 'The new GitHub username')
    .requiredOption('--repo <repo>', 'The specific repository to fix (e.g. owner/repo)')
    .option('--yes', 'Skip confirmation prompt and immediately open PR')
    .action(fix_1.fixCommand);
program.parseAsync(process.argv).catch(err => {
    console.error(chalk_1.default.red('\nUnexpected Error:'), err.message || err);
    process.exit(1);
});
