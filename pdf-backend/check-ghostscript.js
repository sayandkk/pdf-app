const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

async function checkGhostscript() {
  console.log('Checking for Ghostscript installation...');

  const commands = [
    'gswin64c',
    'gswin32c',
    'gs',
    'C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe',
    'C:\\Program Files (x86)\\gs\\gs10.06.0\\bin\\gswin32c.exe',
    'C:\\Program Files\\gs\\gs10.04.0\\bin\\gswin64c.exe',
    'C:\\Program Files (x86)\\gs\\gs10.04.0\\bin\\gswin32c.exe',
    'C:\\Program Files\\Ghostscript\\gswin64c.exe',
    'C:\\Program Files (x86)\\Ghostscript\\gswin32c.exe'
  ];

  for (const cmd of commands) {
    try {
      console.log(`Trying: ${cmd}`);
      const { stdout, stderr } = await execFileAsync(cmd, ['--version']);
      console.log(`✅ Found Ghostscript at: ${cmd}`);
      console.log(`Version: ${stdout.trim()}`);
      return cmd;
    } catch (error) {
      console.log(`❌ Not found at: ${cmd}`);
    }
  }

  console.log('Ghostscript not found in common locations.');
  console.log('Please check your Ghostscript installation and PATH.');
}

checkGhostscript();