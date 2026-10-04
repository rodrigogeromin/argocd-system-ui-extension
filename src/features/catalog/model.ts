import definitions from './addons.json';
import type {AddonApplication, AddonConfig, AddonConfigs, AddonDefinition, TargetConfig} from './types';
export const addons: readonly AddonDefinition[] = definitions;
export const targetDefaults: TargetConfig = {applicationNamespace: 'argocd', project: 'default', server: 'https://kubernetes.default.svc', platform: 'k3d', prometheusURL: ''};
export function defaultConfigs(): AddonConfigs {return Object.fromEntries(addons.map(addon => [addon.id, {name: addon.id, namespace: addon.namespace, version: addon.version, values: '{}'}]));}
export const presets = [
  {title: 'Observabilidade', ids: ['prometheus', 'grafana']},
  {title: 'Istio Sidecar + observabilidade', ids: ['istio-ingress', 'istio-egress', 'kiali', 'grafana']},
  {title: 'Istio Ambient + observabilidade', ids: ['istio-ztunnel', 'istio-ingress', 'istio-egress', 'kiali', 'grafana']}
];
export function getAddon(id: string): AddonDefinition {const addon = addons.find(item => item.id === id); if (!addon) throw new Error(`Addon desconhecido: ${id}`); return addon;}
export function resolvePlan(ids: readonly string[]): AddonDefinition[] {
  const result: AddonDefinition[] = []; const done = new Set<string>(); const visiting = new Set<string>();
  function visit(id: string) {
    if (done.has(id)) return;
    if (visiting.has(id)) throw new Error(`Dependência circular: ${id}`);
    visiting.add(id); const addon = getAddon(id); addon.dependencies.forEach(visit); visiting.delete(id); done.add(id); result.push(addon);
  }
  ids.forEach(visit); return result;
}
function record(value: unknown): value is Record<string, unknown> {return !!value && typeof value === 'object' && !Array.isArray(value);}
export function parseValues(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  if (!record(parsed)) throw new Error('Values deve ser um objeto JSON.');
  function check(node: unknown) {
    if (Array.isArray(node)) {node.forEach(check); return;}
    if (!record(node)) return;
    for (const [key, child] of Object.entries(node)) {if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Chave não permitida em values.'); check(child);}
  }
  check(parsed); return parsed;
}
function merge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result = {...base};
  for (const [key, value] of Object.entries(override)) result[key] = record(value) && record(result[key]) ? merge(result[key] as Record<string, unknown>, value) : value;
  return result;
}
function dns(value: string) {return value.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value);}
export function validateTarget(target: TargetConfig): string | undefined {
  if (!dns(target.applicationNamespace)) return 'Namespace da Application inválido.';
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(target.project)) return 'Informe um projeto válido.';
  try {if (new URL(target.server).protocol !== 'https:') return 'O cluster precisa usar HTTPS.';} catch {return 'Endereço do cluster inválido.';}
  if (target.prometheusURL) {try {if (!['http:', 'https:'].includes(new URL(target.prometheusURL).protocol)) return 'URL do Prometheus inválida.';} catch {return 'URL do Prometheus inválida.';}}
}
export function validatePlan(plan: readonly AddonDefinition[], configs: AddonConfigs, target: TargetConfig): string | undefined {
  const targetError = validateTarget(target); if (targetError) return targetError;
  const names = new Set<string>();
  for (const addon of plan) {
    const config = configs[addon.id];
    if (!config || !dns(config.name) || !dns(config.namespace)) return `${addon.title}: nome ou namespace inválido.`;
    if (names.has(config.name)) return 'As Applications selecionadas precisam de nomes diferentes.';
    names.add(config.name);
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(config.version)) return `${addon.title}: informe uma versão exata do chart.`;
    try {parseValues(config.values);} catch (error) {return `${addon.title}: ${error instanceof Error ? error.message : 'Values JSON inválido.'}`;}
  }
  if (!target.prometheusURL && plan.some(addon => ['grafana', 'kiali'].includes(addon.id))) {
    try {parseValues(configs.prometheus.values);} catch {return 'Values do Prometheus inválido: corrija o JSON ou informe uma URL externa.';}
  }
  const mesh = plan.filter(addon => addon.repository.includes('istio-release'));
  if (new Set(mesh.map(addon => configs[addon.id].version)).size > 1) return 'Selecione a mesma versão para todos os componentes Istio.';
  const core = mesh.filter(addon => !addon.id.includes('ingress') && !addon.id.includes('egress'));
  if (new Set(core.map(addon => configs[addon.id].namespace)).size > 1) return 'Base, istiod, CNI e ztunnel devem usar o mesmo namespace.';
}
export function prometheusURL(target: TargetConfig, configs: AddonConfigs): string {
  if (target.prometheusURL) return target.prometheusURL;
  const values = parseValues(configs.prometheus.values);
  const fullname = typeof values.fullnameOverride === 'string' && values.fullnameOverride ? values.fullnameOverride : 'prometheus-stack';
  return `http://${fullname}-prometheus.${configs.prometheus.namespace}.svc:9090`;
}
export function buildAddonApplication(addon: AddonDefinition, config: AddonConfig, target: TargetConfig, configs: AddonConfigs, plan: readonly AddonDefinition[]): AddonApplication {
  const error = validatePlan(plan, configs, target); if (error) throw new Error(error);
  const ambient = plan.some(item => item.id === 'istio-ztunnel');
  const istioNamespace = configs.istiod.namespace;
  const meshGlobal = {istioNamespace, platform: target.platform};
  let values: Record<string, unknown> = {};
  switch (addon.id) {
    case 'argo-rollouts': values = {installCRDs: true, controller: {replicas: 1}, dashboard: {enabled: false}}; break;
    case 'kyverno': values = {admissionController: {replicas: 1}}; break;
    case 'external-secrets': values = {installCRDs: true}; break;
    case 'prometheus': values = {fullnameOverride: 'prometheus-stack', grafana: {enabled: false}}; break;
    case 'grafana': values = {fullnameOverride: config.name, service: {type: 'ClusterIP'}, datasources: {'datasources.yaml': {apiVersion: 1, datasources: [{name: 'Prometheus', type: 'prometheus', uid: 'prometheus', access: 'proxy', url: prometheusURL(target, configs), isDefault: true}]}}}; break;
    case 'istio-base': values = {global: meshGlobal, defaultRevision: 'default'}; break;
    case 'istiod': values = {global: meshGlobal, ...(ambient ? {profile: 'ambient'} : {}), cni: {enabled: plan.some(item => item.id === 'istio-cni')}}; break;
    case 'istio-cni': values = {global: meshGlobal, ...(ambient ? {profile: 'ambient'} : {})}; break;
    case 'istio-ztunnel': values = {global: meshGlobal, profile: 'ambient'}; break;
    case 'istio-ingress': values = {global: meshGlobal, name: config.name, labels: {istio: 'ingressgateway'}, service: {type: 'ClusterIP'}}; break;
    case 'istio-egress': values = {global: meshGlobal, name: config.name, labels: {istio: 'egressgateway'}, service: {type: 'ClusterIP', ports: [{name: 'status-port', port: 15021, targetPort: 15021}, {name: 'http2', port: 80, targetPort: 80}, {name: 'https', port: 443, targetPort: 443}]}}; break;
    case 'kiali': values = {auth: {strategy: 'token'}, deployment: {view_only_mode: true}, external_services: {prometheus: {url: prometheusURL(target, configs)}, grafana: {enabled: false}}, istio_namespace: istioNamespace}; break;
  }
  const ignoreDifferences: NonNullable<AddonApplication['spec']['ignoreDifferences']> = [
    {group: 'admissionregistration.k8s.io', kind: 'MutatingWebhookConfiguration', jqPathExpressions: ['.webhooks[]?.clientConfig.caBundle']},
    {group: 'admissionregistration.k8s.io', kind: 'ValidatingWebhookConfiguration', jqPathExpressions: ['.webhooks[]?.clientConfig.caBundle', ...(addon.repository.includes('istio-release') ? ['.webhooks[]?.failurePolicy'] : [])]}
  ];
  const mergedValues = merge(values, parseValues(config.values));
  if (addon.id === 'grafana') {
    const fullname = typeof mergedValues.fullnameOverride === 'string' ? mergedValues.fullnameOverride : config.name;
    ignoreDifferences.push({group: '', kind: 'Secret', name: fullname, jsonPointers: ['/data/admin-password']});
    ignoreDifferences.push({group: 'apps', kind: 'Deployment', name: fullname, jsonPointers: ['/spec/template/metadata/annotations/checksum~1secret']});
  }
  return {apiVersion: 'argoproj.io/v1alpha1', kind: 'Application', metadata: {name: config.name, namespace: target.applicationNamespace, labels: {'addons.argocd.io/catalog-id': addon.id}}, spec: {
    project: target.project,
    source: {repoURL: addon.repository, chart: addon.chart, targetRevision: config.version, helm: {releaseName: config.name, valuesObject: mergedValues}},
    destination: {server: target.server, namespace: config.namespace},
    syncPolicy: {automated: {enabled: true, prune: false, selfHeal: true}, syncOptions: ['CreateNamespace=true', 'ServerSideApply=true', 'RespectIgnoreDifferences=true', 'FailOnSharedResource=true']},
    ignoreDifferences
  }};
}
export function matchesAddon(app: AddonApplication, addon: AddonDefinition): boolean {return app.spec.source?.repoURL.replace(/\/$/, '') === addon.repository.replace(/\/$/, '') && app.spec.source?.chart === addon.chart;}
export function applicationFailure(app: AddonApplication): string | undefined {
  const condition = app.status?.conditions?.find(item => item.type.endsWith('Error'));
  if (condition) return `${condition.type}: ${condition.message}`;
  if (['Failed', 'Error'].includes(app.status?.operationState?.phase ?? '')) return app.status?.operationState?.message || 'A sincronização falhou. Abra a Application para diagnóstico.';
}
export function applicationReady(app: AddonApplication): boolean {return app.status?.health?.status === 'Healthy' && app.status.sync?.status === 'Synced' && app.status.operationState?.phase !== 'Running' && !applicationFailure(app);}
