import {ArgoClient, ApiError, parseApplication} from '../src/argocd/api';
import {buildApplication, defaults} from '../src/features/rollouts/application';
const app = buildApplication(defaults);
let fetchMock: jest.Mock;
beforeEach(() => {fetchMock = jest.fn(); global.fetch = fetchMock;});
afterEach(() => {document.querySelector('base')?.remove(); jest.useRealTimers();});
function response(status: number, value: unknown) {return {ok: status >= 200 && status < 300, status, json: async () => value};}
test('uses base href, session credentials, namespace and a direct Application POST body', async () => {
  document.head.innerHTML = '<base href="/argo/">';
  fetchMock.mockResolvedValue(response(200, app));
  const client = new ArgoClient(); const signal = new AbortController().signal;
  await client.get('roll outs', 'argocd', signal, 'default');
  expect(String(fetchMock.mock.calls[0][0])).toBe('http://localhost/argo/api/v1/applications/roll%20outs?appNamespace=argocd&projects=default');
  await client.create(app, signal);
  expect(String(fetchMock.mock.calls[1][0])).toBe('http://localhost/argo/api/v1/applications?validate=true&upsert=false');
  expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({method: 'POST', credentials: 'same-origin', body: JSON.stringify(app)}));
});
test.each([401, 403, 409, 500])('HTTP %s is not interpreted as application absence', async status => {
  fetchMock.mockResolvedValue(response(status, {message: 'server detail'}));
  await expect(new ArgoClient().get('app', 'argocd', new AbortController().signal, 'default')).rejects.toBeInstanceOf(ApiError);
});
test('returns null only for HTTP 404', async () => {
  fetchMock.mockResolvedValue(response(404, {}));
  await expect(new ArgoClient().get('app', 'argocd', new AbortController().signal, 'default')).resolves.toBeNull();
});
test('rejects invalid API responses', () => {
  expect(() => parseApplication({})).toThrow('inválida');
  expect(() => parseApplication({...app, status: {conditions: [{}]}})).toThrow('conditions');
});
test('aborts fetch on caller cancellation', async () => {
  fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))));
  const controller = new AbortController();
  const pending = new ArgoClient().get('app', 'argocd', controller.signal, 'default');
  controller.abort();
  await expect(pending).rejects.toThrow('aborted');
});
test('rejects cross-origin base href', async () => {
  document.head.innerHTML = '<base href="https://other.example/">';
  await expect(new ArgoClient().get('app', 'argocd', new AbortController().signal, 'default')).rejects.toThrow('mesma origem');
  expect(fetchMock).not.toHaveBeenCalled();
});
test('times out hung requests with a recoverable message', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))));
  const pending = new ArgoClient().get('app', 'argocd', new AbortController().signal, 'default');
  const assertion = expect(pending).rejects.toThrow('20 segundos');
  jest.advanceTimersByTime(20000);
  await assertion;
});
test('scopes missing-application lookup to project so Argo CD can return 404', async () => {
  fetchMock.mockImplementation(async url => new URL(String(url)).searchParams.get('projects') === 'default'
    ? response(404, {code: 5, message: 'application not found'})
    : response(403, {code: 7, message: 'permission denied'}));
  await expect(new ArgoClient().get('argo-rollouts', 'argocd', new AbortController().signal, 'default')).resolves.toBeNull();
});
test('does not allow a projectless lookup that would hide absence as permission denied', async () => {
  await expect(new ArgoClient().get('app', 'argocd', new AbortController().signal, '')).rejects.toThrow('projeto');
  expect(fetchMock).not.toHaveBeenCalled();
});
