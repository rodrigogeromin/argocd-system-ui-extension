import {applicationFailure, applicationReady, buildAddonApplication, matchesAddon, validatePlan} from './model';
import type {AddonApplication, AddonConfigs, AddonDefinition, AddonState, CatalogServices, TargetConfig} from './types';
export interface Installation {
  plan: readonly AddonDefinition[]; configs: AddonConfigs; target: TargetConfig;
  client: CatalogServices; signal: AbortSignal; update: (id: string, state: AddonState) => void;
  delay?: (signal: AbortSignal) => Promise<void>; timeoutMs?: number;
}
export function waitForPoll(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {reject(new Error('Acompanhamento interrompido.')); return;}
    const abort = () => {window.clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new Error('Acompanhamento interrompido.'));};
    const timer = window.setTimeout(() => {signal.removeEventListener('abort', abort); resolve();}, 5000);
    signal.addEventListener('abort', abort, {once: true});
  });
}
function ensureActive(signal: AbortSignal) {if (signal.aborted) throw new Error('Acompanhamento interrompido.');}
function checkExisting(app: AddonApplication, addon: AddonDefinition, options: Installation) {
  if (!matchesAddon(app, addon)) throw new Error(`${addon.title}: esse nome pertence a outra Application. Escolha outro nome; ela foi preservada.`);
  const {configs, target} = options;
  if (app.spec.destination.server !== target.server || app.spec.destination.namespace !== configs[addon.id].namespace) throw new Error(`${addon.title}: a Application existente usa outro destino. Ajuste a seleção ou abra a Application.`);
  if (addon.repository.includes('istio-release') && app.spec.source?.targetRevision !== configs[addon.id].version) throw new Error(`${addon.title}: a versão Istio existente é diferente da selecionada. O catálogo não atualiza instalações existentes; alinhe as versões.`);
}
export async function installPlan(options: Installation): Promise<void> {
  const {plan, configs, target, client, signal, update} = options;
  const error = validatePlan(plan, configs, target); if (error) throw new Error(error);
  const apps = new Map<string, AddonApplication>(); const ready = new Set<string>();
  const start = Date.now();
  // Check the entire selection before writing; a conflict or real RBAC failure stops creation.
  for (const addon of plan) {
    ensureActive(signal); update(addon.id, {phase: 'checking'});
    try {
      const app = await client.get(configs[addon.id].name, target.applicationNamespace, signal, target.project);
      ensureActive(signal);
      if (app) {
        checkExisting(app, addon, options);
        const failure = applicationFailure(app); if (failure) throw new Error(`${addon.title}: ${failure}`);
        apps.set(addon.id, app);
        if (applicationReady(app)) ready.add(addon.id);
        update(addon.id, {phase: applicationReady(app) ? 'ready' : 'syncing', app, message: 'Application existente preservada.'});
      } else update(addon.id, {phase: 'queued', message: 'Aguardando dependências.'});
    } catch (failure) {update(addon.id, {phase: 'error', message: failure instanceof Error ? failure.message : 'Falha na consulta.'}); throw failure;}
  }
  while (ready.size < plan.length) {
    ensureActive(signal);
    if (Date.now() - start > (options.timeoutMs ?? 15 * 60 * 1000)) throw new Error('Tempo de acompanhamento excedido. As Applications criadas continuam no Argo CD; retome pela seleção e consulte o status.');
    for (const addon of plan) {
      ensureActive(signal);
      if (apps.has(addon.id) || !addon.dependencies.every(id => ready.has(id))) continue;
      try {
        const app = await client.create(buildAddonApplication(addon, configs[addon.id], target, configs, plan), signal);
        ensureActive(signal); checkExisting(app, addon, options); apps.set(addon.id, app);
        update(addon.id, {phase: applicationReady(app) ? 'ready' : 'syncing', app});
        if (applicationReady(app)) ready.add(addon.id);
      } catch (failure) {update(addon.id, {phase: 'error', message: failure instanceof Error ? failure.message : 'Falha na criação.'}); throw failure;}
    }
    if (ready.size === plan.length) break;
    await (options.delay ?? waitForPoll)(signal);
    for (const addon of plan) {
      if (!apps.has(addon.id) || ready.has(addon.id)) continue;
      ensureActive(signal);
      try {
        const app = await client.get(configs[addon.id].name, target.applicationNamespace, signal, target.project);
        ensureActive(signal);
        if (!app) throw new Error(`${addon.title}: a Application foi removida durante o acompanhamento.`);
        checkExisting(app, addon, options); apps.set(addon.id, app);
        const failure = applicationFailure(app); if (failure) throw new Error(`${addon.title}: ${failure}`);
        if (applicationReady(app)) ready.add(addon.id);
        update(addon.id, {phase: applicationReady(app) ? 'ready' : 'syncing', app});
      } catch (failure) {update(addon.id, {phase: 'error', app: apps.get(addon.id), message: failure instanceof Error ? failure.message : 'Falha no acompanhamento.'}); throw failure;}
    }
  }
}
