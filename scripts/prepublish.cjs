#!/usr/bin/env node

/**
 * Pre-publish script
 * Validates that the package is ready for publishing
 */

const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');

console.log('Running pre-publish checks...');

// Check required fields
const requiredFields = ['name', 'version', 'description', 'author', 'license', 'repository'];
for (const field of requiredFields) {
  if (!packageJson[field]) {
    console.error(`Missing required field: ${field}`);
    process.exit(1);
  }
}

// Check bin file exists
const binPath = path.join(__dirname, '..', 'bin', 'ccx');
if (!fs.existsSync(binPath)) {
  console.error('bin/ccx does not exist');
  process.exit(1);
}

console.log('✓ All pre-publish checks passed');
console.log(`  Package: ${packageJson.name}@${packageJson.version}`);
