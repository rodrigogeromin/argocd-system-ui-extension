# Evidência de instalação — v0.1.1

Verificado em 2026-10-04 no contexto `k3d-dev`, namespace `argocd`, Deployment `argocd-server`, imagem `quay.io/argoproj/argocd:v3.5.1`. A API `/api/version` confirmou `v3.5.1` via port-forward.

O workflow [Release extension](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37181599196) publicou a [release v0.1.1](https://github.com/rodrigogeromin/argocd-system-ui-extension/releases/tag/v0.1.1). Os assets baixados foram conferidos contra o relatório de validação da release, o checksum e a allowlist de arquivos. A sourceRevision e o bundle da release correspondem à validação local.

O patch estratégico da release acrescentou `argocd-extension-installer-argo-rollouts` ao Deployment, preservando `argocd-extension-installer-service-catalog` e todos os volumes existentes. O novo pod `argocd-server-59579fdf54-lbrjd` concluiu os dois init containers com exit code 0 e ficou Ready. `kubectl rollout status` confirmou a conclusão.

O log do installer confirmou download, validação de checksum e instalação. O arquivo `/tmp/extensions/resources/extension-argo-rollouts-installer.js` tem o SHA-256 esperado. `/extensions.js` servido pelo novo pod contém os bytes exatos desse bundle e a extension de catálogo existente.

Identidades verificadas:

| Artefato | SHA-256 |
| --- | --- |
| Fontes | `f1be06f75d03a5c4415e90887423ab3fafefe02889a69f7375471ecdf4c08ef4` |
| Bundle instalado/servido | `2cbc6b224dc7882c8f562ead6c9349505f1a915d4b084d70fa1c96bca01b0573` |
| tar.gz da release instalado | `5978b4233461fdb53a1f52984a0ec389578a6f7f9caf3f6ae91fef9031eab3b4` |
| tar.gz local | `fb59e34958501d60aa415e2df5fa660452755ae7d07ff2e507331f0c983abe0a` |

Os pacotes local e da release diferem pelo modo do arquivo no tar (`0664` local, `0644` no runner); o conteúdo JS é idêntico. O checksum utilizado na instalação é o do asset publicado.

A instalação persiste em novos pods pelo init container. O Deployment observado não tem ownerReference nem rótulo de gestão Helm; se esse Deployment vier a ser gerenciado por GitOps/Helm, incorpore o patch à fonte de verdade.

## Correção do menu lateral

O usuário relatou que v0.1.0 não apareceu no menu. O harness reproduziu o registro antes da montagem do App: o host ainda não havia instalado o listener System Level, e o evento foi perdido. A v0.1.1 aguarda a montagem de `#app` antes de registrar, sem duplicar o registro. O novo teste confirma a sequência `Documentation`, `Argo Rollouts`. A correção foi publicada e instalada; o comportamento no navegador do usuário ainda precisa ser observado.

## Limites da evidência

Não havia navegador disponível no conector de computer use da sessão. Registro e renderização do bundle, criação da Application e acompanhamento são exercitados por **27 testes de domínio/API + 2 testes do harness de produção**, com sucesso local e no GitHub Actions. Não houve interação observada na UI real, nem criação da Application Rollouts no cluster: o usuário pode executar a jornada pelo botão após recarregar o Argo CD.

A instalação do arquivo e a resposta do servidor estão verificadas. A integração completa de navegador continua `not-run`; a matriz de versões integradas fica vazia. `validation-report.json` permanece evidência local com `releaseComplete: false`. O registro estruturado dos fatos de implantação está em `integration-evidence.json`.
