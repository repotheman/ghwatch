const fs = require('fs');

const castData = [
  {"version": 2, "width": 100, "height": 30, "timestamp": Math.floor(Date.now() / 1000), "env": {"SHELL": "/bin/bash", "TERM": "xterm-256color"}},
  [0.1, "o", "$ npx ghwatch scan mafia-creater repotheman --repo repotheman/mafia-creater\r\n"],
  [0.5, "o", "Fetching repositories...\r\n"],
  [1.0, "o", "Scanning repotheman/mafia-creater...\r\n"],
  [1.5, "o", "\r\n\x1b[31mFound 1 references to 'mafia-creater':\x1b[39m\r\n\r\n"],
  [1.6, "o", "┌────────────────────┬──────────────────────────────┬────────┬────────────┬──────────────────────────────────────────────────┐\r\n"],
  [1.61, "o", "│ Repository         │ File                         │ Line   │ Severity   │ Match                                            │\r\n"],
  [1.62, "o", "├────────────────────┼──────────────────────────────┼────────┼────────────┼──────────────────────────────────────────────────┤\r\n"],
  [1.63, "o", "│ repotheman/mafia-… │ README.md                    │ 6      │ \x1b[33mmedium\x1b[39m     │ **mafia-creater/mafia-creater** is a ✨          │\r\n"],
  [1.64, "o", "│                    │                              │        │            │ _special_ ✨ repository because its `README.md`  │\r\n"],
  [1.65, "o", "│                    │                              │        │            │ (this file) appears on your Git...               │\r\n"],
  [1.66, "o", "└────────────────────┴──────────────────────────────┴────────┴────────────┴──────────────────────────────────────────────────┘\r\n"],
  [4.0, "o", "$ npx ghwatch fix mafia-creater repotheman --repo repotheman/mafia-creater\r\n"],
  [4.5, "o", "\x1b[34mFetching repository info for repotheman/mafia-creater...\x1b[39m\r\n"],
  [5.0, "o", "\x1b[90mCloning into temporary directory: /tmp/ghwatch-mafia-creater-IFsuzl\x1b[39m\r\n"],
  [6.5, "o", "\x1b[34mScanning local files and applying fixes...\x1b[39m\r\n"],
  [6.8, "o", "\x1b[32mFixed 1 references in README.md\x1b[39m\r\n"],
  [7.0, "o", "\r\n\x1b[33mModified 1 files.\x1b[39m\r\n"],
  [7.2, "o", "\x1b[33mDo you want to commit, push, and open a PR? (y/N): \x1b[39m"],
  [8.0, "o", "y\r\n"],
  [8.2, "o", "\x1b[34mCommitting and pushing changes...\x1b[39m\r\n"],
  [10.5, "o", "\x1b[34mOpening Pull Request...\x1b[39m\r\n"],
  [12.0, "o", "\r\n\x1b[32mSuccess! Pull Request opened: https://github.com/repotheman/mafia-creater/pull/2\x1b[39m\r\n"],
  [14.0, "o", "$ "]
];

const fileContent = castData.map(item => JSON.stringify(item)).join('\n');
fs.writeFileSync('demo.cast', fileContent);
console.log('demo.cast created successfully.');
