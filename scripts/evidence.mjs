import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {validateProject} from './contract.mjs';
export const hash = data => createHash('sha256').update(data).digest('hex');
export async function sourceRevision() {
  const h = createHash('sha256');
  async function walk(dir) {
    for (const entry of (await readdir(dir, {withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
      const file = `${dir}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Source symlink forbidden: ${file}`);
      if (entry.isDirectory()) await walk(file);
      else h.update(file+'\0').update(await readFile(file)).update('\0');
    }
  }
  for (const dir of ['src','dev','scripts','references']) await walk(dir);
  for (const file of ['extension-project.json','package.json','package-lock.json','webpack.config.cjs','tsconfig.json','eslint.config.mjs','jest.config.cjs']) h.update(file+'\0').update(await readFile(file)).update('\0');
  return h.digest('hex');
}
async function configuredRuntime(){
  const pkg=JSON.parse(await readFile('package.json','utf8'));
  return Object.fromEntries(['react','react-dom','@types/react','@types/react-dom'].map(name=>[name,pkg.dependencies?.[name]??pkg.devDependencies?.[name]??null]));
}
export async function installedRuntime(){
  const result={};
  for(const name of ['react','react-dom','@types/react','@types/react-dom','@testing-library/react'])try{result[name]=JSON.parse(await readFile(`node_modules/${name}/package.json`,'utf8')).version;}catch{result[name]=null;}
  return result;
}
export async function projectConfiguration({checkRuntime=true}={}) {
  const project = JSON.parse(await readFile('extension-project.json','utf8'));
  validateProject(project);
  if(checkRuntime&&project.hostContract.runtime){
    const local=await installedRuntime(), r=project.hostContract.runtime;
    for(const [name,expected] of [['react',r.react],['react-dom',r.reactDom],['@types/react',r.typesReact],['@types/react-dom',r.typesReactDom]])assert.equal(local[name],expected,`Installed ${name} must match audited host runtime; run runtime:setup then npm ci`);
  }
  return project;
}
export async function identity({includeArtifacts = true, validateConfiguration = true} = {}) {
  const p = JSON.parse(await readFile('extension-project.json','utf8'));
  if (validateConfiguration) validateProject(p);
  return {project:p.name ?? null, target:p.argoCdVersion ?? null, profile:p.profile ?? null, sourceTag:p.hostContract?.tag ?? null, sources:p.hostContract?.sources ?? [], signature:p.hostContract?.signature ?? null, props:p.hostContract?.props ?? [], globals:p.hostContract?.globals ?? [], runtime:p.hostContract?.runtime ?? null, flyoutProps:p.hostContract?.flyoutProps ?? [], localRuntime:await installedRuntime(), configuredRuntime:await configuredRuntime(), templateVersion:p.templateVersion ?? null, templateRevision:p.origin?.templateSha256 ?? null, sourceRevision:await sourceRevision(), bundleSha256:includeArtifacts ? hash(await readFile(`dist/resources/extension-${p.name}.js`)) : null, packageSha256:includeArtifacts ? hash(await readFile(`dist/${p.name}.tar.gz`)) : null};
}
export async function checkEvidence(report) {
  await projectConfiguration();
  const required=['typecheck','lint','test','build','package','harness'];
  assert.deepEqual(report.checks.map(c=>c.command),required.map(c=>`npm run ${c}`),'Missing or reordered required checks');
  assert(report.checks.every(c=>c.status==='passed' && c.exitCode===0),'Failed or incomplete required checks');
  assert.equal(report.releaseComplete,false,'Local evidence must not certify release');
  assert.deepEqual(report.identity, await identity(), 'Stale evidence: source/template/bundle/package identity changed');
  assert.equal(report.integration.status, 'not-run', 'This local validator does not certify host integration');
  assert.deepEqual(report.integratedVersions, [], 'Local checks cannot enlarge compatibility matrix');
  return true;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {await checkEvidence(JSON.parse(await readFile('validation-report.json','utf8'))); console.log('Evidence identity current; host integration not-run');}
  catch(error) {console.error(error.message); process.exitCode=1;}
}
