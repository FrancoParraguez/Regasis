const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');

const commands = [
  {
    name: 'backend',
    cmd: 'npm',
    args: ['--prefix', 'backend', 'run', 'dev']
  },
  {
    name: 'frontend',
    cmd: 'npm',
    args: ['--prefix', 'frontend', 'run', 'dev']
  }
];

const children = [];
let shuttingDown = false;

function attachOutput(stream, destination, name) {
  if (!stream) {
    return;
  }

  const reader = createInterface({ input: stream });
  reader.on('line', (line) => {
    destination.write(`[${name}] ${line}\n`);
  });
}

function stopChildren(signal = 'SIGINT') {
  shuttingDown = true;
  const terminationSignal = process.platform === 'win32' && signal === 'SIGINT' ? 'SIGTERM' : signal;

  for (const child of children) {
    if (!child.killed) {
      child.kill(terminationSignal);
    }
  }
}

for (const command of commands) {
  const child = spawn(command.cmd, command.args, {
    env: process.env,
    shell: process.platform === 'win32',
    stdio: ['inherit', 'pipe', 'pipe']
  });

  children.push(child);
  attachOutput(child.stdout, process.stdout, command.name);
  attachOutput(child.stderr, process.stderr, command.name);

  child.on('error', (error) => {
    process.stderr.write(`[${command.name}] ${error.message}\n`);
    stopChildren();
    process.exitCode = 1;
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (signal) {
      stopChildren(signal);
      process.exitCode = 1;
      return;
    }

    if (code !== 0) {
      process.stderr.write(`[${command.name}] exited with code ${code}\n`);
      stopChildren();
      process.exit(code ?? 1);
    } else {
      stopChildren();
      process.exit(0);
    }
  });
}

function handleSignal(signal) {
  if (shuttingDown) {
    return;
  }

  stopChildren(signal);
  process.exit(0);
}

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));
