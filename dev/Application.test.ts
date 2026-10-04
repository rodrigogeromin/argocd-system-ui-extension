import {buildApplication, defaults, isReady, validateConfig} from '../src/features/rollouts/application';
test('installs CRDs with automatic sync and avoids destructive prune', () => {
  const app = buildApplication({...defaults, dashboard: true, replicas: 2});
  expect(app.spec.source?.helm?.valuesObject).toEqual({installCRDs: true, controller: {replicas: 2}, dashboard: {enabled: true}});
  expect(app.spec.syncPolicy).toEqual({automated: {enabled: true, prune: false, selfHeal: true}, syncOptions: ['CreateNamespace=true']});
});
test.each([{name: '../bad'}, {namespace: ''}, {chartVersion: 'latest'}, {replicas: 0}, {server: 'http://cluster'}, {applicationNamespace: 'A'}])('rejects invalid parameters %p', patch => {
  expect(validateConfig({...defaults, ...patch})).toBeDefined();
});
test('readiness requires matching chart, successful operation and no error conditions', () => {
  const app = {...buildApplication(defaults), status: {health: {status: 'Healthy'}, sync: {status: 'Synced'}}};
  expect(isReady(app)).toBe(true);
  expect(isReady({...app, status: {...app.status, operationState: {phase: 'Failed'}}})).toBe(false);
  expect(isReady({...app, status: {...app.status, conditions: [{type: 'ComparisonError', message: 'bad chart'}]}})).toBe(false);
  expect(isReady({...app, status: {...app.status, sync: {status: 'OutOfSync'}}})).toBe(false);
});
