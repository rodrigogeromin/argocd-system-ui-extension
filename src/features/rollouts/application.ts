export const CHART_REPOSITORY = 'https://argoproj.github.io/argo-helm';
export const DEFAULT_CHART_VERSION = '2.43.5';
export interface InstallConfig {
  name: string; applicationNamespace: string; project: string;
  server: string; namespace: string; chartVersion: string; replicas: number; dashboard: boolean;
}
export const defaults: InstallConfig = {
  name: 'argo-rollouts', applicationNamespace: 'argocd', project: 'default',
  server: 'https://kubernetes.default.svc', namespace: 'argo-rollouts',
  chartVersion: DEFAULT_CHART_VERSION, replicas: 1, dashboard: false
};
export type {AddonApplication as RolloutsApplication, CatalogServices as RolloutsServices} from '../catalog/types';
import type {AddonApplication as RolloutsApplication} from '../catalog/types';
export function validateConfig(config: InstallConfig): string | undefined {
  for (const [label, value] of [['Nome da Application', config.name], ['Namespace da Application', config.applicationNamespace], ['Namespace de destino', config.namespace]]) {
    if (value.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value)) return `${label}: use até 63 caracteres minúsculos, números ou hífens.`;
  }
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(config.project)) return 'Informe um projeto válido do Argo CD.';
  try { if (new URL(config.server).protocol !== 'https:') return 'O endereço do cluster deve usar HTTPS.'; } catch { return 'Informe um endereço HTTPS válido para o cluster.'; }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(config.chartVersion)) return 'Informe uma versão exata do chart, como 2.43.5.';
  if (!Number.isInteger(config.replicas) || config.replicas < 1 || config.replicas > 10) return 'Escolha entre 1 e 10 réplicas.';
}
export function buildApplication(config: InstallConfig): RolloutsApplication {
  const error = validateConfig(config);
  if (error) throw new Error(error);
  return {
    apiVersion: 'argoproj.io/v1alpha1', kind: 'Application',
    metadata: {name: config.name, namespace: config.applicationNamespace},
    spec: {
      project: config.project,
      source: {repoURL: CHART_REPOSITORY, chart: 'argo-rollouts', targetRevision: config.chartVersion,
        helm: {releaseName: 'argo-rollouts', valuesObject: {installCRDs: true, controller: {replicas: config.replicas}, dashboard: {enabled: config.dashboard}}}},
      destination: {server: config.server, namespace: config.namespace},
      syncPolicy: {automated: {enabled: true, prune: false, selfHeal: true}, syncOptions: ['CreateNamespace=true']}
    }
  };
}
export function isRolloutsApplication(app: RolloutsApplication): boolean {
  return app.spec.source?.repoURL === CHART_REPOSITORY && app.spec.source.chart === 'argo-rollouts';
}
export function isReady(app: RolloutsApplication): boolean {
  return isRolloutsApplication(app) && app.status?.health?.status === 'Healthy' && app.status?.sync?.status === 'Synced'
    && !['Running', 'Failed', 'Error'].includes(app.status?.operationState?.phase ?? '')
    && !(app.status?.conditions ?? []).some(condition => condition.type.endsWith('Error'));
}
