# Contrato auditado: Argo CD v3.5.1

Perfil: `system-level`. Registro: `registerSystemLevelExtension(component, title, path, icon)`; argumentos: componente, `Argo Rollouts`, `/argo-rollouts`, `fa-rocket`.

Fontes oficiais lidas na tag exata:

- `ui/src/app/shared/services/extensions-service.ts`: registra componente, título, path e ícone; evento `systemLevel`.
- `ui/src/app/index.tsx`: exporta `React`, `ReactDOM`, `ReactJSXRuntime` no window.
- `ui/package.json` e `ui/pnpm-lock.yaml`: runtime resolvido React/ReactDOM 19.2.6, tipos React 19.2.14 e ReactDOM 19.2.3; JSX automático.
- `ui/src/app/app.tsx`, `onAddSystemLevelExtension`: adiciona menu com `fa ${extension.icon}`, rota e `<Page title={extension.title}><extension.component /></Page>`. Nenhum contexto Application/resource/tree é fornecido ao componente.
- `server/application/application.proto`: GET `/api/v1/applications/{name}`, `appNamespace` em ApplicationQuery; POST `/api/v1/applications`, body `application`, flags `upsert` e `validate` na query.

Links das quatro fontes do runtime e seus valores estão em `extension-project.json`. O harness modela a página System Level com props vazias e globals externos. Isso verifica a composição e o bundle localmente; não comprova interação no navegador real.

O índice oficial Helm foi consultado e o pacote argo-rollouts 2.43.5 foi baixado para confirmar `installCRDs`, `controller.replicas` e `dashboard.enabled`. SHA-256 do chart publicado: `4ba91d08d872887ff50ae86a21312d530cd5a5094663df49f4f394bf43f6a62b`. AppVersion: v1.10.0.

## Ordem de inicialização do System Level

O bootstrap chama `createRoot(...).render(<App />)`, que agenda uma montagem assíncrona no React 19. O script `extensions.js` seguinte pode executar antes do constructor de App, onde o listener `systemLevel` é instalado. `registerSystemLevelExtension` emite esse evento imediatamente; o host não recupera registros System Level anteriores para montar o menu.

Desde v0.1.1, o entrypoint aguarda o primeiro elemento renderizado em `#app` usando MutationObserver antes de registrar. Nesse ponto, o constructor já instalou o listener. Se o host já está montado, registra imediatamente. O observer é desconectado antes do registro para não duplicar itens ao renderizar o menu.

O harness de produção reproduz essa ordem: agenda a montagem com createRoot, executa o bundle no mesmo turno e depois confere `Documentation`, `Argo Rollouts` no menu. Esse teste falhou com v0.1.0 e passou com v0.1.1.
