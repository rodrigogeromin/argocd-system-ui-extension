# Evidência de implantação — v0.2.0

Verificado em 2026-10-04: Argo CD **3.5.1**, System Level, tag oficial **v3.5.1**, contexto **k3d-dev**, namespace **argocd**. O contrato continua aderente ao schema instalado da skill e ao runtime React 19.2.6 auditado.

A [release v0.2.0](https://github.com/rodrigogeromin/argocd-system-ui-extension/releases/tag/v0.2.0) foi publicada pelo [workflow](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37198065337) com os checks aprovados. O [CI](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37198064358) também passou. Commit da implementação: `d244367`.

O patch da release atualizou o init container existente, preservando a outra extension service-catalog. O pod `argocd-server-f5887ff6d-5j4xb` está Ready, os dois init containers terminaram com exit code 0 e o rollout concluiu. O installer confirmou checksum e instalação. A API `/api/version` confirmou v3.5.1 e `/extensions.js` contém os bytes exatos do bundle publicado. O arquivo único continua `extension-argo-rollouts-installer.js`, evitando registro duplicado.

| Identidade | SHA-256 |
| --- | --- |
| Fontes | `d5e0ee9deae373ab9f88fdbbb720f692e9ce00639dabee94a44f29a751e75210` |
| Bundle instalado e servido | `a9bdbb24b0523bd2c1608929ed4d25165d9c532124eda14c585a46bbb6aaf2e5` |
| tar.gz publicado | `d7ed1c4e5db6c2e1d67b1bb72e2fb154e531f00d6ee01b0b497506679c59ab13` |
| tar.gz local | `025877ac96931a3f825d65d7003984c9c5710dbc75d319a5e381191e9ef108f2` |

Os archives diferem apenas pelo modo do arquivo no tar (0664 local / 0644 runner); fontes e conteúdo JS correspondem. O asset publicado foi validado contra seu próprio checksum e relatório.

A consulta real, somente leitura, autenticada como admin com `projects=default`, retornou 200/Synced/Healthy para Argo Rollouts e 404 para os outros 11 nomes. Não houve criação de addons, atualização da Application Rollouts ou alteração de RBAC. Credenciais foram utilizadas apenas em memória.

O primeiro pod teve timeout de DNS ao baixar github.com. O novo pod concluiu o download e a verificação. Uma alteração diagnóstica temporária no encaminhamento CoreDNS foi revertida; o upstream original voltou a responder. A configuração de DNS original foi preservada ao concluir.

## Validação e limites

Passaram `runtime:setup`, `npm ci`, `validate` e `evidence:check`: 43 testes de domínio/API/UI e 2 testes do harness de produção. npm audit: zero vulnerabilidades. Os 12 componentes do catálogo renderizaram via Helm para Kubernetes 1.35.3, sem identidades de recursos compartilhadas entre seus manifestos. Templates renderizados não provam o funcionamento de todos os controllers.

Não havia navegador disponível no conector da sessão. O menu e a jornada multi-addon foram testados no harness; a interação no navegador real continua **not-run**, e a matriz de versões integradas permanece vazia. O arquivo instalado e a resposta do servidor estão conferidos. O relatório local não é apresentado como integração completa.

O histórico de v0.1.2, incluindo as regressões do registro antes da montagem React e do GET sem projeto, foi preservado em `previousReleaseEvidence` no [registro estruturado](integration-evidence.json). O catálogo mantém ambas as correções. O usuário havia confirmado o menu antigo visível; o Rollouts existente foi observado saudável nesta implantação.
