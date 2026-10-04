import React, {useState} from 'react';
import {buildAddonApplication, parseValues, resolvePlan, validatePlan} from './model';
import type {AddonConfig, AddonConfigs, AddonDefinition, AddonState, CatalogServices, TargetConfig} from './types';
interface Props {
  addon: AddonDefinition; configs: AddonConfigs; target: TargetConfig; state?: AddonState; busy: boolean;
  client: CatalogServices; change: <K extends keyof AddonConfig>(key: K, value: AddonConfig[K]) => void;
  open: (id: string) => void; refresh: () => void;
}
function fields(values: Record<string, unknown>, prefix: string[] = []): Array<{path: string[]; value: string | number | boolean}> {
  return Object.entries(values).flatMap(([key, value]) => {
    const path = [...prefix, key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [{path, value}];
    if (value && typeof value === 'object' && !Array.isArray(value)) return fields(value as Record<string, unknown>, path);
    return [];
  });
}
export function AddonDetail({addon, configs, target, state, busy, client, change, open, refresh}: Props) {
  const tabs = ['Resumo', 'Parâmetros', 'Manifesto'];
  const [tab, setTab] = useState('Resumo');
  const config = configs[addon.id]; const plan = resolvePlan([addon.id]); const invalid = validatePlan(plan, configs, target);
  const manifest = invalid ? undefined : buildAddonApplication(addon, config, target, configs, plan);
  function parameter(path: string[], value: string | number | boolean) {
    const overrides = parseValues(config.values); let node = overrides;
    for (const key of path.slice(0, -1)) {
      if (!node[key] || typeof node[key] !== 'object' || Array.isArray(node[key])) node[key] = {};
      node = node[key] as Record<string, unknown>;
    }
    node[path[path.length - 1]] = value; change('values', JSON.stringify(overrides, null, 2));
  }
  return <section aria-label={`Detalhes de ${addon.title}`}>
    <div className="rollouts-actions"><button disabled={busy} onClick={refresh}>Atualizar addon</button>{state?.app && <a className="rollouts-link" href={client.applicationURL(state.app.metadata.name, state.app.metadata.namespace ?? target.applicationNamespace)}>Abrir Application de {addon.title} →</a>}</div>
    <div className="addon-tabs" role="tablist" aria-label="Detalhes do addon">{tabs.map(label => <button key={label} id={`addon-tab-${label}`} role="tab" tabIndex={tab === label ? 0 : -1} onKeyDown={event => {const index = tabs.indexOf(tab); const next = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length] : event.key === 'ArrowLeft' ? tabs[(index + tabs.length - 1) % tabs.length] : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : undefined; if (next) {event.preventDefault(); setTab(next); document.getElementById(`addon-tab-${next}`)?.focus();}}} aria-selected={tab === label} aria-controls="addon-panel" onClick={() => setTab(label)}>{label}</button>)}</div>
    <div id="addon-panel" role="tabpanel" aria-labelledby={`addon-tab-${tab}`} className="rollouts-card" tabIndex={0}>
      {tab === 'Resumo' && <><h2>Informações da instalação</h2><dl><dt>Projeto</dt><dd>{state?.app?.spec.project ?? target.project}</dd><dt>Application</dt><dd>{state?.app?.metadata.name ?? config.name}</dd><dt>Cluster</dt><dd>{state?.app?.spec.destination.server ?? target.server}</dd><dt>Namespace</dt><dd>{state?.app?.spec.destination.namespace ?? config.namespace}</dd><dt>Chart</dt><dd>{addon.chart}</dd><dt>Versão</dt><dd>{state?.app?.spec.source?.targetRevision ?? config.version}</dd><dt>Repositório</dt><dd>{addon.repository}</dd><dt>Sync</dt><dd>{state?.app?.status?.sync?.status ?? 'Não consultado'}</dd><dt>Saúde</dt><dd>{state?.app?.status?.health?.status ?? 'Não consultada'}</dd></dl><p>{addon.notes}</p>{state?.message && <p className={state.phase === 'error' ? 'rollouts-error' : 'rollouts-note'}>{state.message}</p>}{addon.dependencies.length > 0 && <><h2>Dependências</h2><div className="rollouts-actions">{plan.filter(item => item.id !== addon.id).map(item => <button key={item.id} onClick={() => open(item.id)}>{item.title}</button>)}</div></>}</>}
      {tab === 'Parâmetros' && <><h2>Configurar instalação</h2><p className="rollouts-note">Configure a Application e os valores Helm antes de revisar a instalação. Para uma Application existente, use a página nativa para editar ou atualizar.</p><fieldset disabled={busy}><div className="rollouts-fields"><label>Nome da Application de {addon.title}<input value={config.name} onChange={event => change('name', event.target.value)} /></label><label>Namespace de {addon.title}<input value={config.namespace} onChange={event => change('namespace', event.target.value)} /></label><label>Versão de {addon.title}<input value={config.version} onChange={event => change('version', event.target.value)} /></label></div><h2>Parâmetros Helm</h2><div className="rollouts-fields">{fields(manifest?.spec.source?.helm?.valuesObject ?? {}).map(({path, value}) => <label key={path.join('.')} className={typeof value === 'boolean' ? 'rollouts-checkbox' : ''}>Helm · {path.join('.')}{typeof value === 'boolean' ? <input type="checkbox" checked={value} onChange={event => parameter(path, event.target.checked)}/> : <input type={typeof value === 'number' ? 'number' : 'text'} value={value} onChange={event => {if (typeof value === 'number') {if (event.target.value !== '' && Number.isFinite(Number(event.target.value))) parameter(path, Number(event.target.value));} else parameter(path, event.target.value);}}/>}</label>)}<label className="rollouts-wide">Values JSON de {addon.title}<textarea rows={12} value={config.values} onChange={event => change('values', event.target.value)} spellCheck={false}/></label></div><small>Overrides são combinados com os padrões do addon. O manifesto mostra os valores finais enviados ao Argo CD.</small></fieldset>{invalid && <p role="alert" className="rollouts-error">{invalid}</p>}</>}
      {tab === 'Manifesto' && <><h2>Application planejada</h2><p className="rollouts-note">Prévia da instalação com as dependências deste addon. A revisão da seleção mostra os manifestos finais da execução.</p>{invalid ? <p role="alert" className="rollouts-error">{invalid}</p> : <pre>{JSON.stringify(manifest, null, 2)}</pre>}{state?.app && <details><summary>Application atual no Argo CD</summary><pre>{JSON.stringify(state.app, null, 2)}</pre></details>}</>}
    </div>
  </section>;
}
