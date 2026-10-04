# Evidência de instalação — v0.1.0

Verificado em 2026-10-04 no contexto `k3d-dev`, namespace `argocd`, Deployment `argocd-server`, imagem `quay.io/argoproj/argocd:v3.5.1`. A API `/api/version` confirmou `v3.5.1` via port-forward.

O workflow [Release extension](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37180928263) publicou a [release v0.1.0](https://github.com/rodrigogeromin/argocd-system-ui-extension/releases/tag/v0.1.0). Os assets baixados foram conferidos contra o relatório de validação da release, o checksum e a allowlist de arquivos. A sourceRevision e o bundle da release correspondem à validação local.

O patch estratégico da release acrescentou `argocd-extension-installer-argo-rollouts` ao Deployment, preservando `argocd-extension-installer-service-catalog` e todos os volumes existentes. O novo pod `argocd-server-54ff654875-rnfqw` concluiu os dois init containers com exit code 0 e ficou Ready. `kubectl rollout status` confirmou a conclusão.

O log do installer confirmou download, validação de checksum e instalação. O arquivo `/tmp/extensions/resources/extension-argo-rollouts-installer.js` tem o SHA-256 esperado. `/extensions.js` servido pelo novo pod contém os bytes exatos desse bundle e a extension de catálogo existente.

Identidades verificadas:

| Artefato | SHA-256 |
| --- | --- |
| Fontes | `068b1fe126f58481dd353ab21b15453d12eb2ffff2537276a292e2d8d05316b5` |
| Bundle instalado/servido | `21724488dfdb5e1a42bfbc543d3deea6f1f54843aa2d590b2468d9b3354e6029` |
| tar.gz da release instalado | `7419e70ba57ade3803803b939d3d57bc2e2151dd812806f73fa4d2a3621f7f06` |
| tar.gz local | `828658c75bec347c8083eecfbb5a28412a09459f5cb0c8d54225f62ef1de9db3` |

Os pacotes local e da release diferem pelo modo do arquivo no tar (`0664` local, `0644` no runner); o conteúdo JS é idêntico. O checksum utilizado na instalação é o do asset publicado.

A instalação persiste em novos pods pelo init container. O Deployment observado não tem ownerReference nem rótulo de gestão Helm; se esse Deployment vier a ser gerenciado por GitOps/Helm, incorpore o patch à fonte de verdade.

## Limites da evidência

Não havia navegador disponível no conector de computer use da sessão. Registro e renderização do bundle, criação da Application e acompanhamento são exercitados por **27 testes de domínio/API + 1 harness de produção**, com sucesso local e no GitHub Actions. Não houve interação observada na UI real, nem criação da Application Rollouts no cluster: o usuário pode executar a jornada pelo botão após recarregar o Argo CD.

A instalação do arquivo e a resposta do servidor estão verificadas. A integração completa de navegador continua `not-run`; a matriz de versões integradas fica vazia. `validation-report.json` permanece evidência local com `releaseComplete: false`. O registro estruturado dos fatos de implantação está em `integration-evidence.json`.
