import {writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {identity, projectConfiguration} from './evidence.mjs';
const commands = ['typecheck','lint','test','build','package','harness'];
export async function runValidation({runCheck = command => spawnSync('npm', ['run',command], {stdio:'inherit'}), npmVersion = /npm\/([^ ]+)/.exec(process.env.npm_config_user_agent ?? '')?.[1]} = {}) {
  if (!npmVersion) throw new Error('Cannot identify npm version; run via npm run validate');
  const checks = commands.map(command=>({command:`npm run ${command}`,status:'not-run',exitCode:null}));
  const configuration = {status:'passed'};
  try {await projectConfiguration();}
  catch(error) {Object.assign(configuration,{status:'failed',error:error.message});}
  if (configuration.status === 'passed') for (const command of commands) {
    const run = runCheck(command);
    Object.assign(checks.find(c=>c.command===`npm run ${command}`),{status:!run.error && run.status === 0 ? 'passed':'failed', exitCode:run.status, ...(run.error ? {error:run.error.message}: {})});
    if (run.error || run.status !== 0) break;
  }
  const passed = configuration.status === 'passed' && checks.every(c=>c.status==='passed');
  const identityRecord=await identity({includeArtifacts:passed,validateConfiguration:false});
  const report = {schemaVersion:2, generatedAt:new Date().toISOString(), environment:{node:process.version,npm:npmVersion,platform:process.platform}, identity:identityRecord, configuration, artifacts:{status:passed?'validated':'not-validated',reason:passed?null:'Configuration or required check failed; artifact hashes are unavailable for this validation'}, checks, harness:{status:checks.find(c=>c.command==='npm run harness').status,kind:'simulated host globals; not Argo CD integration'}, integration:{status:'not-run',reason:`No ${identityRecord.target} host was installed/tested by local validation`}, integratedVersions:[], releaseComplete:false};
  await writeFile('validation-report.json',JSON.stringify(report,null,2)+'\n');
  return report;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await runValidation();
  if (report.configuration.status === 'failed' || report.checks.some(c=>c.status==='failed')) process.exitCode=1;
}
