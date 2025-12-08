#!/usr/bin/env node

/**
 * Fix for cpu-features build issue
 * Generates the missing buildcheck.gypi file before electron-builder runs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cpuFeaturesPath = path.join(__dirname, '..', 'node_modules', 'cpu-features');
const buildcheckGypiPath = path.join(cpuFeaturesPath, 'buildcheck.gypi');
const buildcheckJsPath = path.join(cpuFeaturesPath, 'buildcheck.js');

// Check if cpu-features is installed
if (!fs.existsSync(cpuFeaturesPath)) {
  console.log('cpu-features not found, skipping fix...');
  process.exit(0);
}

// Check if buildcheck.gypi already exists
if (fs.existsSync(buildcheckGypiPath)) {
  console.log('buildcheck.gypi already exists, skipping generation...');
  process.exit(0);
}

// Check if buildcheck.js exists
if (!fs.existsSync(buildcheckJsPath)) {
  console.log('buildcheck.js not found, skipping fix...');
  process.exit(0);
}

try {
  console.log('Generating buildcheck.gypi for cpu-features...');
  // Run buildcheck.js and save output to buildcheck.gypi
  const output = execSync(`node "${buildcheckJsPath}"`, {
    cwd: cpuFeaturesPath,
    encoding: 'utf8'
  });
  
  fs.writeFileSync(buildcheckGypiPath, output);
  console.log('Successfully generated buildcheck.gypi');
} catch (error) {
  console.error('Failed to generate buildcheck.gypi:', error.message);
  // Don't fail the install process, just warn
  process.exit(0);
}

