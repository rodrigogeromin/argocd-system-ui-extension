import {installPlan} from '../src/features/catalog/install';
import {buildAddonApplication, defaultConfigs, resolvePlan, targetDefaults} from '../src/features/catalog/model';
import type {AddonApplication, CatalogServices} from '../src/features/catalog/types';
const ready = (app: AddonApplication): AddonApplication => ({...app, status: {sync: {status: 'Synced'}, health: {status: 'Healthy'}}});
function fixture(ids: string[]) {
  const configs = defaultConfigs(), plan = resolvePlan(ids), controller = new AbortController();
  const apps = Object.fromEntries(plan.map(addon => [addon.id, buildAddonApplication(addon, configs[addon.id], targetDefaults, configs, plan)]));
  const get = jest.fn(), create = jest.fn();
  const client: CatalogServices = {get, create, applicationURL: (name, namespace) => `/${namespace}/${name}`};
  return {plan, configs, target: targetDefaults, client, signal: controller.signal, controller, update: jest.fn(), delay: async () => {}, get, create, apps};
}
test('preflight of the entire plan stops on RBAC failure before any POST', async () => {
  const f = fixture(['argo-rollouts', 'kyverno']); f.get.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('permission denied'));
  await expect(installPlan(f)).rejects.toThrow('permission denied'); expect(f.create).not.toHaveBeenCalled();
});
test('preserves existing ready Rollouts and installs only missing independent addon', async () => {
  const f = fixture(['argo-rollouts', 'kyverno']); f.get.mockResolvedValueOnce(ready(f.apps['argo-rollouts'])).mockResolvedValueOnce(null); f.create.mockImplementation(async app => ready(app));
  await installPlan(f); expect(f.create).toHaveBeenCalledTimes(1); expect(f.create.mock.calls[0][0].spec.source.chart).toBe('kyverno');
  expect(f.get.mock.calls.every(call => call[3] === 'default')).toBe(true);
});
test('waits for base health before creating istiod', async () => {
  const f = fixture(['istiod']); f.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(ready(f.apps['istio-base']));
  let polled = false;
  f.create.mockImplementation(async app => {if (app.metadata.name === 'istiod') {expect(polled).toBe(true); return ready(app);} return app;});
  f.delay = async () => {polled = true;};
  await installPlan(f); expect(f.create.mock.calls.map(call => call[0].metadata.name)).toEqual(['istio-base', 'istiod']);
});
test('does not adopt another chart or destination using the same name', async () => {
  const f = fixture(['kyverno']); f.get.mockResolvedValue({...f.apps.kyverno, spec: {...f.apps.kyverno.spec, source: {...f.apps.kyverno.spec.source!, chart: 'other'}}});
  await expect(installPlan(f)).rejects.toThrow('outra Application'); expect(f.create).not.toHaveBeenCalled();
  f.get.mockResolvedValue({...f.apps.kyverno, spec: {...f.apps.kyverno.spec, destination: {namespace: 'elsewhere', server: targetDefaults.server}}});
  await expect(installPlan(f)).rejects.toThrow('outro destino');
});
test('stops dependency creation after a base synchronization failure', async () => {
  const f = fixture(['istiod']); f.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({...f.apps['istio-base'], status: {operationState: {phase: 'Failed', message: 'CRD rejected'}}}); f.create.mockResolvedValue(f.apps['istio-base']);
  await expect(installPlan(f)).rejects.toThrow('CRD rejected'); expect(f.create).toHaveBeenCalledTimes(1);
});
test('aborting does not submit any further addon', async () => {
  const f = fixture(['kyverno', 'external-secrets']); f.get.mockResolvedValue(null); f.create.mockImplementation(async app => {f.controller.abort(); return ready(app);});
  await expect(installPlan(f)).rejects.toThrow('interrompido'); expect(f.create).toHaveBeenCalledTimes(1);
});
test('existing Istio version skew never triggers upgrade or dependent creation', async () => {
  const f = fixture(['istiod']); f.get.mockResolvedValue({...f.apps['istio-base'], spec: {...f.apps['istio-base'].spec, source: {...f.apps['istio-base'].spec.source!, targetRevision: '1.30.5'}}});
  await expect(installPlan(f)).rejects.toThrow('versão Istio existente'); expect(f.create).not.toHaveBeenCalled();
});
test('resumes a partially installed plan using the existing healthy dependency', async () => {
  const f = fixture(['istiod']); f.get.mockResolvedValueOnce(ready(f.apps['istio-base'])).mockResolvedValueOnce(null); f.create.mockImplementation(async app => ready(app));
  await installPlan(f); expect(f.create).toHaveBeenCalledTimes(1); expect(f.create.mock.calls[0][0].metadata.name).toBe('istiod');
});
