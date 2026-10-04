import {addons, applicationReady, discoveredState, kyvernoEmptyMetadataRule, buildAddonApplication, defaultConfigs, getAddon, parseValues, presets, resolvePlan, targetDefaults, validatePlan} from '../src/features/catalog/model';
test('catalog covers the requested platform components and deduplicates dependencies', () => {
  expect(addons.map(addon => addon.id)).toEqual(expect.arrayContaining(['argo-rollouts', 'kyverno', 'external-secrets', 'prometheus', 'grafana', 'istio-base', 'istiod', 'istio-cni', 'istio-ztunnel', 'istio-ingress', 'istio-egress', 'kiali']));
  const plan = resolvePlan(['istio-ztunnel', 'istio-ingress']);
  expect(plan.map(addon => addon.id)).toEqual(['istio-base', 'istiod', 'istio-cni', 'istio-ztunnel', 'istio-ingress']);
});
test('all presets produce valid manifests with exact pins, autosync and safe CRD application', () => {
  for (const preset of presets) {
    const configs = defaultConfigs(), plan = resolvePlan(preset.ids);
    expect(validatePlan(plan, configs, targetDefaults)).toBeUndefined();
    for (const addon of plan) {
      const app = buildAddonApplication(addon, configs[addon.id], targetDefaults, configs, plan);
      expect(app.spec.syncPolicy?.automated?.prune).toBe(false);
      expect(app.spec.syncPolicy?.syncOptions).toContain('ServerSideApply=true');
      expect(app.spec.source?.targetRevision).toMatch(/^\d+\.\d+\.\d+$/);
    }
  }
});
test('Istio uses ambient and platform settings only when the chosen topology requires them', () => {
  const configs = defaultConfigs(), plan = resolvePlan(['istio-ztunnel']);
  expect(buildAddonApplication(getAddon('istiod'), configs.istiod, targetDefaults, configs, plan).spec.source?.helm?.valuesObject).toEqual(expect.objectContaining({profile: 'ambient', global: {platform: 'k3d', istioNamespace: 'istio-system'}, cni: {enabled: true}}));
  expect(buildAddonApplication(getAddon('istiod'), configs.istiod, targetDefaults, configs, resolvePlan(['istiod'])).spec.source?.helm?.valuesObject).not.toHaveProperty('profile');
});
test('version skew and different core namespaces are blocked before installation', () => {
  const configs = defaultConfigs(), plan = resolvePlan(['istio-ztunnel']);
  configs.istiod.version = '1.30.5'; expect(validatePlan(plan, configs, targetDefaults)).toMatch(/mesma versão/);
  configs.istiod.version = configs['istio-base'].version; configs['istio-cni'].namespace = 'other'; expect(validatePlan(plan, configs, targetDefaults)).toMatch(/mesmo namespace/);
});
test('observability disables bundled Grafana and points standalone Grafana to the selected namespace', () => {
  const configs = defaultConfigs(); configs.prometheus.namespace = 'metrics';
  const plan = resolvePlan(['prometheus', 'grafana']);
  expect(buildAddonApplication(getAddon('prometheus'), configs.prometheus, targetDefaults, configs, plan).spec.source?.helm?.valuesObject).toHaveProperty('grafana.enabled', false);
  expect(JSON.stringify(buildAddonApplication(getAddon('grafana'), configs.grafana, targetDefaults, configs, plan))).toContain('http://prometheus-stack-prometheus.metrics.svc:9090');
});
test('custom values deep-merge without mutating defaults and do not allow prototype pollution', () => {
  const configs = defaultConfigs(); configs['argo-rollouts'].values = '{"controller":{"replicas":2},"dashboard":{"enabled":true}}';
  const app = buildAddonApplication(getAddon('argo-rollouts'), configs['argo-rollouts'], targetDefaults, configs, resolvePlan(['argo-rollouts']));
  expect(app.spec.source?.helm?.valuesObject).toEqual({installCRDs: true, controller: {replicas: 2}, dashboard: {enabled: true}});
  expect(() => parseValues('{"__proto__":{"admin":true}}')).toThrow('Chave'); expect(() => parseValues('[]')).toThrow('objeto');
});
test('duplicate application names and invalid values are rejected', () => {
  const configs = defaultConfigs(), plan = resolvePlan(['prometheus', 'grafana']);
  configs.grafana.name = 'prometheus'; expect(validatePlan(plan, configs, targetDefaults)).toMatch(/nomes diferentes/);
  configs.grafana.name = 'grafana'; configs.grafana.values = 'invalid'; expect(validatePlan(plan, configs, targetDefaults)).toBeDefined();
});

test('healthy OutOfSync installation is visible while dependency readiness remains strict', () => {
  const addon = getAddon('kyverno'), configs = defaultConfigs();
  const app = {...buildAddonApplication(addon, configs.kyverno, targetDefaults, configs, resolvePlan(['kyverno'])), status: {health: {status: 'Healthy'}, sync: {status: 'OutOfSync'}}};
  expect(discoveredState(app, addon).phase).toBe('installed'); expect(applicationReady(app)).toBe(false);
  expect(discoveredState({...app, status: {health: {status: 'Progressing'}, sync: {status: 'Synced'}}}, addon).phase).toBe('syncing');
  expect(discoveredState(null, addon).phase).toBe('absent');
});
test('empty metadata normalization applies only to Kyverno policy CRDs and preserves schema comparison', () => {
  const configs = defaultConfigs();
  const kyverno = buildAddonApplication(getAddon('kyverno'), configs.kyverno, targetDefaults, configs, resolvePlan(['kyverno']));
  expect(kyverno.spec.ignoreDifferences).toContainEqual(kyvernoEmptyMetadataRule);
  expect(kyvernoEmptyMetadataRule.jqPathExpressions).toEqual(['annotations', 'labels'].map(field => `select(.metadata.name | endswith(".policies.kyverno.io")) | .metadata.${field} | select(. == {})`));
  const rollouts = buildAddonApplication(getAddon('argo-rollouts'), configs['argo-rollouts'], targetDefaults, configs, resolvePlan(['argo-rollouts']));
  expect(rollouts.spec.ignoreDifferences).not.toContainEqual(kyvernoEmptyMetadataRule);
});
