import {buildApplication, defaults} from '../src/features/rollouts/application';
import type {AddonApplication} from '../src/features/catalog/types';
const applications = new Map<string, AddonApplication>();
const polls = new Map<string, number>();
if (new URLSearchParams(location.search).get('api') === 'existing') applications.set('argo-rollouts', {...buildApplication(defaults), status: {sync: {status: 'Synced'}, health: {status: 'Healthy'}}});
// Preview-only API; never imported by the installed entrypoint.
window.fetch = async (input, init) => {
  if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (new URLSearchParams(location.search).get('api') === 'forbidden') return {ok: false, status: 403, json: async () => ({message: 'Permissão negada (preview)'})} as Response;
  let name: string;
  if (init?.method === 'POST') {
    const app = JSON.parse(String(init.body)) as AddonApplication; name = app.metadata.name;
    applications.set(name, app); polls.set(name, 0);
  } else {
    name = decodeURIComponent(new URL(String(input)).pathname.split('/').pop() ?? '');
    const app = applications.get(name), count = (polls.get(name) ?? 0) + 1; polls.set(name, count);
    if (app && count >= 2) applications.set(name, {...app, status: {sync: {status: 'Synced'}, health: {status: 'Healthy'}, operationState: {phase: 'Succeeded'}}});
  }
  const app = applications.get(name);
  return {ok: !!app, status: app ? 200 : 404, json: async () => app ?? {code: 5, message: 'Not found'}} as Response;
};
