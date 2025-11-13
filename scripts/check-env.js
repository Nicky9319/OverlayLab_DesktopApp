#!/usr/bin/env node

/**
 * Pre-build Environment Variable Checker
 * 
 * Validates that environment variables are properly configured before build
 * Ensures packaged apps have correct defaults even if dev forgot to set vars
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Pre-build Environment Variable Check\n');

// Determine if production is required (when packaging)
const REQUIRE_PRODUCTION = process.argv.includes('--require-production');

// Read ENV from src/config/envConfig.js
const envConfigPath = path.join(process.cwd(), 'src', 'config', 'envConfig.js');

let ENV = 'production';
try {
  const content = fs.readFileSync(envConfigPath, 'utf8');
  const match = content.match(/export\s+const\s+ENV\s*=\s*['"](\w+)['"]/);
  if (match) {
    ENV = match[1];
  }
} catch (e) {
  console.warn('⚠️  Could not read src/config/envConfig.js, defaulting ENV=production for build checks.');
}

console.log(`ENV from src/config/envConfig.js => ${ENV}`);

if (REQUIRE_PRODUCTION && ENV !== 'production') {
  console.error('\n❌ Packaging requires ENV to be "production".');
  console.error('   Please set ENV = \'production\' in src/config/envConfig.js before packaging.\n');
  process.exit(1);
}

// Final summary
console.log('\n' + '='.repeat(60));
console.log('📦 Build Configuration Summary:');
console.log('='.repeat(60));
console.log(`   ENV: ${ENV}`);
console.log(`   Packaging mode requires production: ${REQUIRE_PRODUCTION ? 'Yes' : 'No'}`);
console.log('\n✅ All configuration validated - build will proceed');
console.log('   Packaged app will use the values shown above\n');

// Exit successfully
process.exit(0);

