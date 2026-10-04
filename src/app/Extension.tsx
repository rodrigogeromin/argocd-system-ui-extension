import React, {useEffect, useRef, useState} from 'react';
import {buildApplication, defaults, isReady, isRolloutsApplication, validateConfig} from '../features/rollouts/application';
import type {InstallConfig, RolloutsApplication, RolloutsServices} from '../features/rollouts/application';
import type {ExtensionProps} from '../argocd/types';
import '../styles/extension.css';
export function Extension({client}: ExtensionProps & {client: RolloutsServices}) {
  const [config, setConfig] = useState<InstallConfig>({...defaults});
  const [app, setApp] = useState<RolloutsApplication | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('Pronto para configurar a instalação.');
  const request = useRef<AbortController | null>(null);
  const poll = useRef<number | undefined>(undefined);
  const active = useRef(false);
  useEffect(() => () => { request.current?.abort(); window.clearTimeout(poll.current); }, []);
  const invalid = validateConfig(config);
  function field<K extends keyof InstallConfig>(key: K, value: InstallConfig[K]) {
    request.current?.abort(); window.clearTimeout(poll.current); setApp(null); setError('');
    setConfig(previous => ({...previous, [key]: value}));
  }
  async function run(create: boolean) {
    if (active.current || invalid) return;
    active.current = true;
    request.current?.abort(); window.clearTimeout(poll.current);
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setNotice('Verificando a Application no Argo CD…');
    try {
      let current = await client.get(config.name, config.applicationNamespace, controller.signal, config.project);
      if (!current && create) {
        setNotice('Criando a Application Helm…');
        current = await client.create(buildApplication(config), controller.signal);
      }
      if (controller.signal.aborted) return;
      setApp(current);
      if (!current) { setNotice('Nenhuma Application encontrada neste projeto. Revise a configuração e instale.'); return; }
      if (!isRolloutsApplication(current)) { setError('Esse nome já pertence a outra Application. Escolha outro nome; nenhuma alteração foi realizada.'); return; }
      setNotice(create ? 'Application encontrada ou criada. Acompanhando a configuração existente.' : 'Application encontrada. Acompanhando a instalação.');
      const watch = async () => {
        try {
          const latest = await client.get(config.name, config.applicationNamespace, controller.signal, config.project);
          if (controller.signal.aborted) return;
          setApp(latest);
          if (!latest) { setError('A Application foi removida. Consulte novamente antes de instalar.'); return; }
          if (!isRolloutsApplication(latest)) { setError('A source da Application foi alterada. Abra a Application para revisar.'); return; }
          if (isReady(latest)) { setNotice('Argo Rollouts instalado: Application sincronizada e saudável.'); return; }
          poll.current = window.setTimeout(() => { void watch(); }, 5000);
        } catch (failure) { if (!controller.signal.aborted) setError(`${failure instanceof Error ? failure.message : 'Falha ao acompanhar a instalação.'} Use Consultar instalação para retomar.`); }
      };
      if (isReady(current)) setNotice('Argo Rollouts instalado: Application sincronizada e saudável.');
      else poll.current = window.setTimeout(() => { void watch(); }, 5000);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Não foi possível acessar o Argo CD.');
    } finally { active.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  const ready = !!app && isReady(app);
  const managed = !!app && isRolloutsApplication(app);
  const steps = ['Configurar', 'Criar Application', 'Sincronizar', 'Pronto'];
  const step = ready ? 3 : managed ? 2 : busy ? 1 : 0;
  return <section id="argocd-ext-argo-rollouts-installer" aria-label="Instalação do Argo Rollouts">
    <header className="rollouts-header"><span className="rollouts-eyebrow">PLATAFORMA · ENTREGA PROGRESSIVA</span><h1>Instale o Argo Rollouts</h1><p>Um controller para estratégias canary e blue-green, instalado com Helm e gerenciado pelo Argo CD.</p></header>
    <ol className="rollouts-steps" aria-label="Progresso">{steps.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} className={index <= step ? 'is-active' : ''}><span>{index + 1}</span>{label}</li>)}</ol>
    <div className="rollouts-grid"><div className="rollouts-card"><h2>Configuração da instalação</h2><p>Use um projeto que permita o repositório Helm, o destino e os recursos de cluster do chart.</p>
      <fieldset disabled={busy || managed}><legend className="rollouts-sr-only">Parâmetros da Application</legend><div className="rollouts-fields">
        <label>Nome da Application<input value={config.name} onChange={e => field('name', e.target.value)} /></label>
        <label>Projeto Argo CD<input value={config.project} onChange={e => field('project', e.target.value)} /></label>
        <label>Namespace da Application<input value={config.applicationNamespace} onChange={e => field('applicationNamespace', e.target.value)} /></label>
        <label>Namespace de destino<input value={config.namespace} onChange={e => field('namespace', e.target.value)} /></label>
        <label className="rollouts-wide">Cluster de destino (server)<input value={config.server} onChange={e => field('server', e.target.value)} /><small>Endereço de um cluster já cadastrado no Argo CD.</small></label>
        <label>Versão do chart<input value={config.chartVersion} onChange={e => field('chartVersion', e.target.value)} /></label>
        <label>Réplicas do controller<input type="number" min="1" max="10" value={config.replicas} onChange={e => field('replicas', Number(e.target.value))} /></label>
      </div><label className="rollouts-checkbox"><input type="checkbox" checked={config.dashboard} onChange={e => field('dashboard', e.target.checked)} />Instalar também o dashboard do Rollouts</label></fieldset>
      <p className="rollouts-note">A instalação inclui CRDs, permissões de cluster e criação do namespace. A sincronização automática e self-heal ficam habilitados; prune fica desabilitado.</p>
      {invalid && <p role="alert">{invalid}</p>}
      <div className="rollouts-actions"><button className="rollouts-primary" disabled={busy || !!invalid || managed} onClick={() => { void run(true); }}>{busy ? 'Processando…' : managed ? 'Application criada' : 'Instalar Argo Rollouts'}</button><button disabled={busy || !!invalid} onClick={() => { void run(false); }}>Consultar instalação</button></div>
    </div><aside className="rollouts-card"><h2>Revise e acompanhe</h2><p role="status" aria-live="polite">{notice}</p>{error && <p role="alert" className="rollouts-error">{error}</p>}
      {app && <><dl><dt>Application</dt><dd>{app.metadata.name}</dd><dt>Chart em uso</dt><dd>{app.spec.source?.chart ?? 'Outra source'} · {app.spec.source?.targetRevision}</dd><dt>Destino em uso</dt><dd>{app.spec.destination.server ?? app.spec.destination.name} / {app.spec.destination.namespace}</dd><dt>Sincronização</dt><dd>{app.status?.sync?.status ?? 'Aguardando'}</dd><dt>Saúde</dt><dd>{app.status?.health?.status ?? 'Aguardando'}</dd><dt>Operação</dt><dd>{app.status?.operationState?.phase ?? 'Aguardando'}</dd></dl>
      {app.status?.operationState?.message && <p>{app.status.operationState.message}</p>}{app.status?.conditions?.map((condition, index) => <p className="rollouts-error" key={index}>{condition.type}: {condition.message}</p>)}<a className="rollouts-link" href={client.applicationURL(app.metadata.name, app.metadata.namespace ?? config.applicationNamespace)}>Abrir Application no Argo CD →</a></>}
      <details><summary>Manifesto que será enviado à API</summary><pre>{JSON.stringify(invalid ? {erro: invalid} : buildApplication(config), null, 2)}</pre></details>
      <p className="rollouts-note">A API usa sua sessão e as permissões RBAC do Argo CD. Uma Application existente é consultada e preservada.</p>
    </aside></div>
  </section>;
}
export function ExtensionFlyout() { return null; }
