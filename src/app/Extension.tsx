import React, {useEffect, useMemo, useRef, useState} from 'react';
import {addons, discoveredState, buildAddonApplication, defaultConfigs, getAddon, presets, resolvePlan, targetDefaults, validatePlan, validateTarget} from '../features/catalog/model';
import {installPlan} from '../features/catalog/install';
import type {AddonConfig, AddonConfigs, AddonState, CatalogServices, TargetConfig} from '../features/catalog/types';
import type {ExtensionProps} from '../argocd/types';
import '../styles/extension.css';
import {AddonDetail} from '../features/catalog/AddonDetail';
function currentAddon() {const id = new URLSearchParams(window.location.search).get('addon'); return addons.some(addon => addon.id === id) ? id : null;}
function addonURL(id: string | null) {const url = new URL(window.location.href); if (id) url.searchParams.set('addon', id); else url.searchParams.delete('addon'); return url.pathname + url.search + url.hash;}
const phaseLabels = {absent: 'Não instalado', checking: 'Consultando', queued: 'Na fila', syncing: 'Sincronizando', installed: 'Instalado', ready: 'Instalado', error: 'Erro'};
export function Extension({client}: ExtensionProps & {client: CatalogServices}) {
  const [detailId, setDetailId] = useState<string | null>(currentAddon);
  const detail = detailId ? getAddon(detailId) : undefined;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {const pop = () => {setDetailId(currentAddon()); setReview(false);}; window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop);}, []);
  useEffect(() => {heading.current?.focus();}, [detailId]);
  function openAddon(id: string | null) {window.history.pushState({}, '', addonURL(id)); setDetailId(id); setReview(false);}
  const [target, setTarget] = useState<TargetConfig>({...targetDefaults});
  const [configs, setConfigs] = useState<AddonConfigs>(defaultConfigs);
  const [selected, setSelected] = useState<string[]>([]);
  const [states, setStates] = useState<Record<string, AddonState>>({});
  const [search, setSearch] = useState(''); const [category, setCategory] = useState('Todos');
  const [review, setReview] = useState(false); const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Escolha os addons para compor sua plataforma.'); const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null); const active = useRef(false);
  const discoveryRequest = useRef<AbortController | null>(null);
  const [discovering, setDiscovering] = useState(false);
  useEffect(() => () => {request.current?.abort(); discoveryRequest.current?.abort();}, []);
  const discoveryScope = JSON.stringify([target.project, target.applicationNamespace, target.server, addons.map(addon => [configs[addon.id].name, configs[addon.id].namespace])]);
  useEffect(() => {void discover(); return () => discoveryRequest.current?.abort();}, [discoveryScope]);
  const plan = useMemo(() => resolvePlan(selected), [selected]);
  const included = new Set(plan.map(addon => addon.id));
  const invalid = validatePlan(plan, configs, target);
  const filtered = addons.filter(addon => (category === 'Todos' || addon.category === category) && `${addon.title} ${addon.description}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const categories = ['Todos', ...new Set(addons.map(addon => addon.category))];
  function update(id: string, state: AddonState) {setStates(previous => ({...previous, [id]: state}));}
  function changeTarget<K extends keyof TargetConfig>(key: K, value: TargetConfig[K]) {
    request.current?.abort();
    if (['project', 'applicationNamespace', 'server'].includes(key)) {discoveryRequest.current?.abort(); setStates({});}
    setTarget(previous => ({...previous, [key]: value})); setError(''); setReview(false);
  }
  function changeConfig<K extends keyof AddonConfig>(id: string, key: K, value: AddonConfig[K]) {
    request.current?.abort();
    if (['name', 'namespace'].includes(key)) {
      discoveryRequest.current?.abort();
      setStates(previous => {const next = {...previous}; delete next[id]; return next;});
    }
    setConfigs(previous => ({...previous, [id]: {...previous[id], [key]: value}})); setError('');
  }
  function toggle(id: string) {setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]); setError(''); setReview(false);}
  async function discover(id?: string) {
    if (active.current || validateTarget(target)) return;
    discoveryRequest.current?.abort(); const controller = new AbortController(); discoveryRequest.current = controller; setDiscovering(true);
    const snapshot = configs; const items = id ? [getAddon(id)] : addons;
    items.forEach(addon => update(addon.id, {phase: 'checking'}));
    try {
      // Read in small batches, preserving an individual result/error for every card.
      for (let index = 0; index < items.length; index += 4) {
        if (controller.signal.aborted) return;
        await Promise.all(items.slice(index, index + 4).map(async addon => {
          try {
            const app = await client.get(snapshot[addon.id].name, target.applicationNamespace, controller.signal, target.project);
            if (controller.signal.aborted) return;
            update(addon.id, discoveredState(app, addon));
          } catch (failure) {if (!controller.signal.aborted) update(addon.id, {phase: 'error', message: failure instanceof Error ? failure.message : 'Falha na consulta.'});}
        }));
      }
      if (!controller.signal.aborted) setNotice('Status atualizado. Consulte cada card para ver Applications existentes ou erros.');
    } finally {if (discoveryRequest.current === controller) setDiscovering(false);}
  }
  async function install() {
    if (active.current || invalid || plan.length === 0) return;
    active.current = true; request.current?.abort(); const controller = new AbortController(); request.current = controller; setBusy(true); setError('');
    discoveryRequest.current?.abort(); setDiscovering(false);
    setStates(previous => Object.fromEntries(Object.entries(previous).filter(([, state]) => state.phase !== 'checking')));
    setNotice('Verificando a seleção e instalando em ordem de dependências…');
    try {
      await installPlan({plan, configs, target, client, signal: controller.signal, update});
      if (!controller.signal.aborted) setNotice('Instalação concluída: todos os addons selecionados estão Synced e Healthy.');
    } catch (failure) {
      if (controller.signal.aborted) setNotice('Acompanhamento interrompido. Applications já criadas continuam sincronizando no Argo CD.');
      else {setError(failure instanceof Error ? failure.message : 'Falha na instalação.'); setNotice('Execução interrompida. Revise o erro e retome; Applications existentes serão preservadas.');}
    } finally {active.current = false; setBusy(false);}
  }
  return <section id="argocd-ext-argo-rollouts-installer" aria-label="Addons">
    {detail && <button className="addon-back" onClick={() => openAddon(null)}><i className="fa fa-arrow-left" aria-hidden="true"/> Voltar para Addons</button>}
    <header className="rollouts-header"><span className="rollouts-eyebrow">PLATAFORMA · ADDONS KUBERNETES</span><nav aria-label="Navegação de addons">{detail ? <><a className="rollouts-link" href={addonURL(null)} onClick={event => {event.preventDefault(); openAddon(null);}}>Addons</a><span> / {detail.title}</span></> : null}</nav><h1 ref={heading} tabIndex={-1}>{detail?.title ?? 'Addons'}</h1><p>{detail?.description ?? 'Escolha, configure e instale os componentes da sua plataforma com Applications gerenciadas pelo Argo CD.'}</p></header>
    {!detail && <div className="catalog-toolbar"><label>Buscar addon<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Istio, políticas, observabilidade…" /></label><label>Categoria<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></label><button disabled={busy || discovering || !!validateTarget(target)} onClick={() => {void discover();}}>Atualizar status</button></div>}
    <details className="rollouts-card catalog-target"><summary>Destino da instalação · {target.project} · {target.applicationNamespace}</summary><fieldset disabled={busy}><div className="rollouts-fields">
      <label>Projeto Argo CD<input value={target.project} onChange={event => changeTarget('project', event.target.value)} /></label>
      <label>Namespace das Applications<input value={target.applicationNamespace} onChange={event => changeTarget('applicationNamespace', event.target.value)} /></label>
      <label className="rollouts-wide">Cluster de destino (server)<input value={target.server} onChange={event => changeTarget('server', event.target.value)} /></label>
      <label>Plataforma para Istio<select value={target.platform} onChange={event => changeTarget('platform', event.target.value)}>{['k3d', 'k3s', 'default', 'gke', 'eks', 'openshift', 'minikube'].map(item => <option key={item}>{item}</option>)}</select></label>
      <label>URL do Prometheus (opcional)<input value={target.prometheusURL} onChange={event => changeTarget('prometheusURL', event.target.value)} placeholder="Automática a partir do addon Prometheus" /><small>Para Grafana e Kiali. Informe aqui se já usa um Prometheus externo ou com outro nome.</small></label>
    </div></fieldset></details>
    {!detail && <div className="catalog-presets"><span>Seleções prontas</span>{presets.map(preset => <button key={preset.title} disabled={busy} onClick={() => {setSelected(preset.ids); setReview(false); setError('');}}>{preset.title}</button>)}</div>}
    <p role="status" aria-live="polite">{discovering ? 'Consultando instalações existentes…' : notice}</p>{error && <p role="alert" className="rollouts-error">{error}</p>}{invalid && <p role="alert" className="rollouts-error">{invalid}</p>}
    {detail ? <><AddonDetail key={detail.id} addon={detail} configs={configs} target={target} state={states[detail.id]} busy={busy} client={client} change={(key, value) => changeConfig(detail.id, key, value)} open={openAddon} refresh={() => {void discover(detail.id);}}/><label className="rollouts-checkbox"><input type="checkbox" checked={included.has(detail.id)} disabled={busy || (included.has(detail.id) && !selected.includes(detail.id))} onChange={() => toggle(detail.id)}/>{included.has(detail.id) && !selected.includes(detail.id) ? `${detail.title} incluído como dependência` : `Selecionar ${detail.title}`}</label></> : <><div className="catalog-cards">{filtered.map(addon => {
      const state = states[addon.id]; const automatic = included.has(addon.id) && !selected.includes(addon.id);
      return <article className={`rollouts-card catalog-addon ${included.has(addon.id) ? 'is-selected' : ''}`} key={addon.id} onClick={event => {if (!(event.target as HTMLElement).closest('a, input, button, label')) openAddon(addon.id);}}>
        <div className="catalog-card-heading"><i className={`fa ${addon.icon}`} aria-hidden="true"/><span className="catalog-category">{addon.category}</span><span className={`catalog-badge phase-${state?.phase ?? 'unknown'}`}>{state ? phaseLabels[state.phase] : 'Status não consultado'}</span></div>
        <a className="addon-card-link" href={addonURL(addon.id)} onClick={event => {event.preventDefault(); openAddon(addon.id);}} aria-label={`Ver detalhes de ${addon.title}`}><h2>{addon.title}</h2><p>{addon.description}</p><p className="rollouts-note">Chart {addon.chart} · {configs[addon.id].version} · {addon.appVersion}</p></a>
        <label className="rollouts-checkbox"><input type="checkbox" checked={included.has(addon.id)} disabled={busy || automatic} onChange={() => toggle(addon.id)} />{automatic ? `${addon.title} incluído como dependência` : `Selecionar ${addon.title}`}</label>
        {addon.dependencies.length > 0 && <p className="rollouts-note">Requer: {addon.dependencies.map(id => getAddon(id).title).join(', ')}.</p>}
        {state?.app && <><p className="rollouts-note">Application {state.app.metadata.name} · versão em uso {state.app.spec.source?.targetRevision} · {state.app.status?.sync?.status ?? 'Aguardando'} / {state.app.status?.health?.status ?? 'Aguardando'}</p><a className="rollouts-link" href={client.applicationURL(state.app.metadata.name, state.app.metadata.namespace ?? target.applicationNamespace)}>Abrir Application de {addon.title} →</a></>}
        {state?.message && <p className={state.phase === 'error' ? 'rollouts-error' : 'rollouts-note'}>{state.message}</p>}

      </article>;
    })}</div>{filtered.length === 0 && <p>Nenhum addon corresponde à busca.</p>}</>}
    <div className="catalog-selection rollouts-card"><div><h2>{plan.length} addon{plan.length === 1 ? '' : 's'} na seleção</h2><p>{plan.length ? plan.map(addon => addon.title).join(' → ') : 'Selecione um addon ou use uma seleção pronta.'}</p><p className="rollouts-note">Dependências são incluídas automaticamente e aguardam saúde antes de liberar os próximos componentes. Uma Application existente é preservada; o catálogo não realiza upgrades.</p></div><div className="rollouts-actions"><button disabled={busy || !selected.length} onClick={() => {setSelected([]); setReview(false);}}>Limpar seleção</button><button className="rollouts-primary" disabled={busy || !plan.length || !!invalid} onClick={() => setReview(true)}>Revisar instalação</button>{busy && <button onClick={() => request.current?.abort()}>Parar acompanhamento</button>}</div></div>
    {review && plan.length > 0 && <section className="rollouts-card catalog-review" aria-label="Revisão da instalação"><h2>Revise as Applications</h2><p>Serão criadas somente as Applications ausentes no projeto selecionado. Sincronização automática e self-heal ficam habilitados, prune desabilitado. Os addons podem criar CRDs, webhooks e permissões de cluster.</p>
      {plan.map(addon => <details key={addon.id}><summary>{addon.title} · {configs[addon.id].name} · {configs[addon.id].namespace} · {configs[addon.id].version}</summary><pre>{JSON.stringify(invalid ? {erro: invalid} : buildAddonApplication(addon, configs[addon.id], target, configs, plan), null, 2)}</pre></details>)}
      <div className="rollouts-actions"><button className="rollouts-primary" disabled={busy || !!invalid} onClick={() => {void install();}}>{busy ? 'Instalando e acompanhando…' : 'Instalar selecionados'}</button><button disabled={busy} onClick={() => setReview(false)}>Voltar ao catálogo</button></div>
      <p className="rollouts-note">Ao sair ou parar o acompanhamento, as Applications já criadas continuam sincronizando. Retome usando a mesma seleção. Gateways internos, storage e integrações podem exigir configuração específica do seu ambiente.</p>
    </section>}
  </section>;
}
export function ExtensionFlyout() {return null;}
