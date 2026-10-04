import {buildApplication, defaults} from '../src/features/rollouts/application';
import type {RolloutsApplication} from '../src/features/rollouts/application';
let application: RolloutsApplication | null = null;
let polls = 0;
// Preview-only API; this module is never imported by the installed entrypoint.
window.fetch = async (_input, init) => {
  if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (init?.method === 'POST') { application = JSON.parse(String(init.body)) as RolloutsApplication; polls = 0; }
  else if (application && ++polls >= 2) application = {...application, status: {sync: {status: 'Synced'}, health: {status: 'Healthy'}, operationState: {phase: 'Succeeded'}}};
  const fixture = new URLSearchParams(location.search).get('api');
  if (fixture === 'forbidden') return {ok: false, status: 403, json: async () => ({message: 'Permissão negada (preview)'})} as Response;
  if (fixture === 'existing') application = {...buildApplication(defaults), status: {sync: {status: 'Synced'}, health: {status: 'Healthy'}}};
  return {ok: !!application, status: application ? 200 : 404, json: async () => application ?? {message: 'Not found'}} as Response;
};
