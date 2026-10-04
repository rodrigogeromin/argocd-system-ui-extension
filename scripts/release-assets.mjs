import {readFile, writeFile} from 'node:fs/promises';
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const tag = process.env.RELEASE_TAG || `v${version}`;
const repository = process.env.RELEASE_REPOSITORY || 'rodrigogeromin/argocd-system-ui-extension';
if (tag !== `v${version}` || !/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid release identity');
const patch = (await readFile('deploy/argocd-server-patch.yaml', 'utf8'))
  .replaceAll('v0.1.0', tag)
  .replaceAll('rodrigogeromin/argocd-system-ui-extension', repository);
await writeFile('dist/argocd-server-patch.yaml', patch);
