import { copyFileSync } from 'fs';
import { resolve } from 'path';

export default function copyLoggerPlugin() {
  return {
    name: 'copy-logger',
    writeBundle() {
      try {
        const sourcePath = resolve(__dirname, 'logger.js');
        const targetPath = resolve(__dirname, 'out/main/logger.js');
        copyFileSync(sourcePath, targetPath);
        console.log('✅ Copied logger.js to out/main/logger.js');
      } catch (error) {
        console.error('❌ Failed to copy logger.js:', error.message);
      }
    }
  };
}
