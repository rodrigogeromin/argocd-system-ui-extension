import type {RolloutsApplication} from '../features/rollouts/application';
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = 'ApiError'; }
}
export function argoBaseURL(): URL {
  const base = new URL(document.querySelector('base')?.getAttribute('href') || '/', window.location.origin);
  if (base.origin !== window.location.origin) throw new Error('O base href do Argo CD deve usar a mesma origem.');
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  base.search = ''; base.hash = '';
  return base;
}
export function applicationURL(name: string, namespace: string): string {
  return new URL(`applications/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`, argoBaseURL()).href;
}
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function parseApplication(value: unknown): RolloutsApplication {
  if (!isRecord(value) || !isRecord(value.metadata) || typeof value.metadata.name !== 'string' || !isRecord(value.spec)
    || typeof value.spec.project !== 'string' || !isRecord(value.spec.destination) || typeof value.spec.destination.namespace !== 'string') {
    throw new Error('A API retornou uma Application inválida.');
  }
  for (const [record, keys] of [[value.metadata, ['namespace']], [value.spec.destination, ['server', 'name']]] as const) {
    for (const key of keys) if (record[key] !== undefined && typeof record[key] !== 'string') throw new Error('A API retornou metadados ou destino inválidos.');
  }
  if (isRecord(value.spec.source) && value.spec.source.chart !== undefined && typeof value.spec.source.chart !== 'string') throw new Error('A API retornou um chart inválido.');
  if (value.spec.source !== undefined && (!isRecord(value.spec.source) || typeof value.spec.source.repoURL !== 'string' || typeof value.spec.source.targetRevision !== 'string')) throw new Error('A API retornou uma source inválida.');
  if (value.status !== undefined) {
    if (!isRecord(value.status)) throw new Error('A API retornou um status inválido.');
    for (const key of ['health', 'sync', 'operationState']) {
      const item = value.status[key];
      if (item !== undefined && (!isRecord(item) || (item.status !== undefined && typeof item.status !== 'string') || (item.phase !== undefined && typeof item.phase !== 'string') || (item.message !== undefined && typeof item.message !== 'string'))) throw new Error('A API retornou um status inválido.');
    }
    const conditions = value.status.conditions;
    if (conditions !== undefined && (!Array.isArray(conditions) || conditions.some(item => !isRecord(item) || typeof item.type !== 'string' || typeof item.message !== 'string'))) throw new Error('A API retornou conditions inválidas.');
  }
  return value as unknown as RolloutsApplication;
}
export class ArgoClient {
  async request(path: string, signal: AbortSignal, body?: RolloutsApplication): Promise<RolloutsApplication> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, {once: true});
    if (signal.aborted) controller.abort();
    const timeout = window.setTimeout(abort, 20000);
    try {
      const response = await fetch(new URL(`api/v1/${path}`, argoBaseURL()), {
        method: body ? 'POST' : 'GET', credentials: 'same-origin', signal: controller.signal,
        headers: {Accept: 'application/json', ...(body ? {'Content-Type': 'application/json'} : {})},
        ...(body ? {body: JSON.stringify(body)} : {})
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = isRecord(data) && typeof data.message === 'string' ? ` ${data.message}` : '';
        const messages: Record<number, string> = {401: 'Sua sessão expirou. Entre novamente no Argo CD.', 403: 'Seu usuário não tem permissão para esta operação no Argo CD.', 409: 'Já existe uma Application com esse nome. Consulte a instalação.'};
        throw new ApiError(response.status, (messages[response.status] || `A API do Argo CD respondeu HTTP ${response.status}.`) + detail);
      }
      return parseApplication(data);
    } catch (error) {
      if (controller.signal.aborted && !signal.aborted) throw new Error('A API demorou mais de 20 segundos. Consulte a instalação antes de tentar novamente.');
      throw error;
    } finally { window.clearTimeout(timeout); signal.removeEventListener('abort', abort); }
  }
  async get(name: string, namespace: string, signal: AbortSignal, project: string): Promise<RolloutsApplication | null> {
    if (!project) throw new Error('Informe o projeto para consultar a Application.');
    // Without a project, Argo CD obscures missing applications with HTTP 403, even for admin.
    try { return await this.request(`applications/${encodeURIComponent(name)}?appNamespace=${encodeURIComponent(namespace)}&projects=${encodeURIComponent(project)}`, signal); }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  }
  create(application: RolloutsApplication, signal: AbortSignal) {
    return this.request('applications?validate=true&upsert=false', signal, application);
  }
}
