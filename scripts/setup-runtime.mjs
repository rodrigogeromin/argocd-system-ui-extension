import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {projectConfiguration} from './evidence.mjs';
const project=await projectConfiguration({checkRuntime:false});
const runtime=project.hostContract.runtime;
if(!runtime)throw new Error('Audited hostContract.runtime is required before runtime setup');
const major=Number(runtime.react.split('.')[0]);
if(![16,17,18,19].includes(major))throw new Error('Unsupported React runtime; audit preview and testing tools first');
const pkg=JSON.parse(await readFile('package.json','utf8'));
pkg.devDependencies??={};
for(const [name,version] of [['react',runtime.react],['react-dom',runtime.reactDom]]){
  const section=Object.hasOwn(pkg.devDependencies,name)&&!Object.hasOwn(pkg.dependencies??{},name)?'devDependencies':'dependencies';
  pkg[section]??={};pkg[section][name]=version;
  delete pkg[section==='dependencies'?'devDependencies':'dependencies']?.[name];
}
Object.assign(pkg.devDependencies,{'@types/react':runtime.typesReact,'@types/react-dom':runtime.typesReactDom,'@testing-library/react':major<18?'12.1.5':'16.3.2'});
const ts=JSON.parse(await readFile('tsconfig.json','utf8'));ts.compilerOptions.jsx=project.hostContract.jsxMode==='automatic'?'react-jsx':'react';
await writeFile('package.json',JSON.stringify(pkg,null,2)+'\n');await writeFile('tsconfig.json',JSON.stringify(ts,null,2)+'\n');
await writeFile('dev/runtime.tsx',major<18?"import ReactDOM from 'react-dom';\nimport type {ReactElement} from 'react';\nexport function mount(element:HTMLElement,node:ReactElement){ReactDOM.render(node,element);}\n":"import {createRoot} from 'react-dom/client';\nimport type {ReactElement} from 'react';\nexport function mount(element:HTMLElement,node:ReactElement){createRoot(element).render(node);}\n");
await writeFile('dev/host-runtime.ts',project.hostContract.globals.includes('ReactJSXRuntime')?"import * as runtime from 'react/jsx-runtime';\nexport const jsxRuntime=runtime;\n":"export const jsxRuntime=undefined;\n");
const run=spawnSync('npm',['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund'],{stdio:'inherit'});
if(run.error||run.status!==0)throw new Error('Runtime files updated; npm lock update failed; rerun setup before npm ci');
console.log('Runtime aligned; run npm ci, npm run validate, npm run evidence:check');
