export interface AddonApplication {
  apiVersion?: string; kind?: string;
  metadata: {name: string; namespace?: string; labels?: Record<string, string>};
  spec: {
    project: string;
    source?: {repoURL: string; chart?: string; targetRevision: string; helm?: {releaseName?: string; valuesObject?: Record<string, unknown>}};
    destination: {server?: string; name?: string; namespace: string};
    syncPolicy?: {automated?: {enabled?: boolean; prune?: boolean; selfHeal?: boolean}; syncOptions?: string[]};
    ignoreDifferences?: Array<{group: string; kind: string; name?: string; jsonPointers?: string[]; jqPathExpressions?: string[]}>;
  };
  status?: {health?: {status?: string; message?: string}; sync?: {status?: string}; operationState?: {phase?: string; message?: string}; conditions?: Array<{type: string; message: string}>};
}
export interface CatalogServices {
  get(name: string, namespace: string, signal: AbortSignal, project: string): Promise<AddonApplication | null>;
  create(application: AddonApplication, signal: AbortSignal): Promise<AddonApplication>;
  applicationURL(name: string, namespace: string): string;
}
export interface AddonDefinition {
  id: string; title: string; description: string; category: string; icon: string;
  repository: string; chart: string; version: string; appVersion: string;
  namespace: string; dependencies: string[]; notes: string;
}
export interface TargetConfig {applicationNamespace: string; project: string; server: string; platform: string; prometheusURL: string}
export interface AddonConfig {name: string; namespace: string; version: string; values: string}
export type AddonConfigs = Record<string, AddonConfig>;
export type InstallPhase = 'absent' | 'checking' | 'queued' | 'syncing' | 'installed' | 'ready' | 'error';
export interface AddonState {phase: InstallPhase; app?: AddonApplication; message?: string}
