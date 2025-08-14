// esbuild configuration for local development and testing
import { build } from 'esbuild';

const config = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  outdir: 'dist',
  platform: 'node',
  target: 'es2020',
  format: 'esm',
  sourcemap: true,
  minify: false,
  external: ['@aws-sdk/*', '@prisma/client'],
  banner: {
    js: `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`,
  },
};

// Build function for programmatic usage
export const buildProject = async () => {
  try {
    await build(config);
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
};

// Run build if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildProject();
}

export default config;
