# Evidência de instalação — v0.1.2

Verificado em 2026-10-04 no contexto `k3d-dev`, namespace `argocd`, Deployment `argocd-server`, imagem `quay.io/argoproj/argocd:v3.5.1`. A API `/api/version` confirmou `v3.5.1` via port-forward.

O workflow [Release extension](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37182063681) publicou a [release v0.1.2](https://github.com/rodrigogeromin/argocd-system-ui-extension/releases/tag/v0.1.2). Os assets baixados foram conferidos contra o relatório de validação da release, o checksum e a allowlist de arquivos. A sourceRevision e o bundle da release correspondem à validação local.

O patch estratégico da release acrescentou `argocd-extension-installer-argo-rollouts` ao Deployment, preservando `argocd-extension-installer-service-catalog` e todos os volumes existentes. O novo pod `argocd-server-7b489797fc-t2454` concluiu os dois init containers com exit code 0 e ficou Ready. `kubectl rollout status` confirmou a conclusão.

O log do installer confirmou download, validação de checksum e instalação. O arquivo `/tmp/extensions/resources/extension-argo-rollouts-installer.js` tem o SHA-256 esperado. `/extensions.js` servido pelo novo pod contém os bytes exatos desse bundle e a extension de catálogo existente.

Identidades verificadas:

| Artefato | SHA-256 |
| --- | --- |
| Fontes | `fc90c32e769a202199a79b24cd9f106bf424645c0e4eb40a58580cbf18e1bfb8` |
| Bundle instalado/servido | `44836a805f1c6a4b82adf34615ec542bc192c6f213d768673d40cbcaba402374` |
| tar.gz da release instalado | `e3020b36553a3d2fd0362984f1f7d25be3e8a98d6dbaae4f28c1d022b61613d2` |
| tar.gz local | `7d4843f1ed4993c88aebda57dcce9d7d898ece1e728016220d6314aa8fe5a43f` |

Os pacotes local e da release diferem pelo modo do arquivo no tar (`0664` local, `0644` no runner); o conteúdo JS é idêntico. O checksum utilizado na instalação é o do asset publicado.

A instalação persiste em novos pods pelo init container. O Deployment observado não tem ownerReference nem rótulo de gestão Helm; se esse Deployment vier a ser gerenciado por GitOps/Helm, incorpore o patch à fonte de verdade.

## Correção do menu lateral

O usuário relatou que v0.1.0 não apareceu no menu. O harness reproduziu o registro antes da montagem do App: o host ainda não havia instalado o listener System Level, e o evento foi perdido. A correção introduzida em v0.1.1 aguarda a montagem de `#app` antes de registrar, sem duplicar o registro. O novo teste confirma a sequência `Documentation`, `Argo Rollouts`. A correção foi publicada e instalada; o comportamento no navegador do usuário ainda precisa ser observado.

## Consulta da Application autenticada como admin

Após o menu aparecer, o usuário relatou `permission denied` ao usar a jornada. Os logs confirmaram `user=admin`, `application does not exist` e o GET sem projeto. Uma reprodução real autenticada como admin confirmou HTTP 403/code 7 sem projeto e HTTP 404/code 5 com `projects=default`, para a mesma Application ausente.

A v0.1.2 envia o projeto configurado no preflight e em todos os polls. O teste de regressão falhou com o cliente anterior e passou com a correção. Erros reais 401/403 continuam bloqueando a criação. Não houve alteração de RBAC. O projeto default observado permite repositório, destino e recursos de cluster necessários ao chart.

## Limites da evidência

Não havia navegador disponível no conector de computer use da sessão. Registro e renderização do bundle, criação da Application e acompanhamento são exercitados por **30 testes de domínio/API + 2 testes do harness de produção**, com sucesso local e no GitHub Actions. Não houve interação observada na UI real, nem criação da Application Rollouts no cluster: o usuário pode executar a jornada pelo botão após recarregar o Argo CD.

A instalação do arquivo e a resposta do servidor estão verificadas. A integração completa de navegador continua `not-run`; a matriz de versões integradas fica vazia. `validation-report.json` permanece evidência local com `releaseComplete: false`. O registro estruturado dos fatos de implantação está em `integration-evidence.json`.
