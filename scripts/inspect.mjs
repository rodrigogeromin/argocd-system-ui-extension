import {readFile, readdir, lstat} from 'node:fs/promises';
import assert from 'node:assert/strict';
const project = JSON.parse(await readFile('extension-project.json', 'utf8'));
assert.deepEqual(await readdir('dist/resources'), [`extension-${project.name}.js`], 'Production must contain exactly one JS file');
assert((await lstat(`dist/resources/extension-${project.name}.js`)).isFile(), 'Bundle must be a regular file, never a symlink');
const stats = JSON.parse(await readFile('dist/build-modules.json', 'utf8'));
assert.equal(stats.errors?.length ?? 0, 0, 'Build errors');
function flatten(modules) {return (modules ?? []).flatMap(m => [m, ...flatten(m.modules)]);}
const modules = flatten(stats.modules);
assert(modules.some(m => m.name === 'external "React"'), 'React must use the host global');
if(project.hostContract.globals.includes('ReactJSXRuntime'))assert(modules.some(m=>m.name==='external "ReactJSXRuntime"'),'JSX runtime must use host global');
for(const module of modules.filter(m=>/^external "(ReactDOM|ReactJSXRuntime)"$/.test(m.name??''))) assert(project.hostContract.globals.includes(module.name.match(/^external "([^"]+)"$/)[1]), `${module.name} is not in the target host contract`);
assert(!modules.some(m => /node_modules[\\/](?:react|react-dom)[\\/]/.test(m.name ?? '')), 'Host React/DOM runtime was bundled');
assert(!modules.some(m => /react-dom[\\/]client|jsx-dev-runtime/.test(m.name ?? '')), 'Unsupported host import');
console.log('Bundle inspection passed: single JS; React runtime external; no client/dev runtime');
