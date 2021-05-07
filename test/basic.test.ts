import manifestPlugin from '../lib/index';
import fs from 'fs';

const OUTPUT_MANIFEST = 'test/output/manifest.json';

function buildOptions(pluginOptions = {}, overrideBuildOptions = {}) {
  const defaultBuildOptions = {
    entryPoints: ['test/input/example.js'],
    outdir: 'test/output',
    plugins: [manifestPlugin(pluginOptions)],
  }

  return {...defaultBuildOptions, ...overrideBuildOptions};
};

function metafileContents(): {[key: string]: string} {
  return JSON.parse(fs.readFileSync(OUTPUT_MANIFEST, 'utf-8'));
};

beforeEach(() => {
  fs.rmSync('test/output', { recursive: true, force: true });
});

test('it returns a valid esbuild plugin interface', () => {
  expect(manifestPlugin()).toHaveProperty('name');
  expect(manifestPlugin()).toHaveProperty('setup');
  expect(manifestPlugin().name).toBe('manifest');
});

test('it works with a require call', () => {
  const manifestPlugin = require('../lib/index');
  expect(manifestPlugin()).toHaveProperty('name');
  expect(manifestPlugin()).toHaveProperty('setup');
});

test('it should include the esbuild metafile during setup', async () => {
  const result = await require('esbuild').build(buildOptions());

  expect(result).toHaveProperty('metafile');
});

test('it should generate the manifest.json in the outdir', async () => {
  await require('esbuild').build(buildOptions());

  expect(fs.existsSync(OUTPUT_MANIFEST)).toBe(true);
});

test('it should generate hashed filenames by default', async () => {
  await require('esbuild').build(buildOptions());

  expect(metafileContents()['example.js']).toMatch(/^example-[^\.]+\.js$/);
});

test('it should not have an opinion on hashes when a flag is set', async () => {
  await require('esbuild').build(buildOptions({hash: false}));

  expect(metafileContents()['example.js']).toBe('example.js');
});

test('it should not override the hashing format if one was supplied already', async () => {
  // our internal hash format uses a '-' instead of a '.'
  await require('esbuild').build(buildOptions({}, {entryNames: '[dir]/[name].[hash]'}));

  expect(metafileContents()['example.js']).toMatch(/^example\.[^\.]+\.js$/);
});

test('it should generate short names by default', async () => {
  await require('esbuild').build(buildOptions({hash: false}));

  expect(metafileContents()).toMatchObject({'example.js': 'example.js'});
});

test('it should generate long names if specified', async () => {
  await require('esbuild').build(buildOptions({hash: false, shortNames: false}));

  expect(metafileContents()).toMatchObject({'test/input/example.js': 'test/output/example.js'});
});

test('it should generate a different filename if specified', async () => {
  await require('esbuild').build(buildOptions({filename: 'example.json'}));

  expect(fs.existsSync('test/output/example.json')).toBe(true);
  expect(fs.existsSync(OUTPUT_MANIFEST)).toBe(false);
});

test('it should use the same directory as the outfile if no outdir was given', async () => {
  await require('esbuild').build(buildOptions({}, {outdir: undefined, outfile: 'test/output/out.js'}));

  expect(fs.existsSync(OUTPUT_MANIFEST)).toBe(true);
});

test('it should throw an error if building without an outdir or outfile', async () => {
  let caughtError;

  await require('esbuild').build(buildOptions({}, {outdir: undefined, outfile: undefined}))
    .catch((e: Error) => caughtError = e);

  expect(caughtError).toBeInstanceOf(Error);
});

// how to handle conflicting short names
