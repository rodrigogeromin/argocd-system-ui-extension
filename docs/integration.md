# Evidência de implantação — v0.2.1

Verificado em 2026-10-04: Argo CD **3.5.1**, System Level, tag oficial **v3.5.1**, contexto **k3d-dev**, namespace **argocd**. Schema validado pela skill instalada; runtime React 19.2.6 preservado.

A [release v0.2.1](https://github.com/rodrigogeromin/argocd-system-ui-extension/releases/tag/v0.2.1) adiciona **Addons** no menu, lista/detalhe com breadcrumb, links diretos e histórico do navegador, abas Resumo/Parâmetros/Manifesto e edição tipada dos parâmetros Helm. O [workflow de release](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37199102862) e o [CI](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37199101590) passaram. Implementação: `2a81234`, enviada a develop.

O patch da release atualizou o init container existente, preservando service-catalog e os volumes. O pod `argocd-server-78547b6f65-vx7sv` está Ready, ambos os init containers terminaram com código 0 e o rollout concluiu. Checksum conferido pelo installer. `/api/version` confirmou v3.5.1; `/extensions.js` contém os bytes exatos do bundle publicado. O nome legado do arquivo evita registros duplicados.

| Identidade | SHA-256 |
| --- | --- |
| Fontes | `f0b4e4564327a812aa622742a0a4a8c738e1f7fcdd206c5bb30c1014373928b7` |
| Bundle instalado/servido | `9e57ec2fff5bf01a1ebe02664f77878c233db02fd82a09c15a85d3eab2164461` |
| tar.gz publicado | `73fc189b462c927111e4dd0561b12ad3b685e21d17cdb2f66f95462f374710a6` |
| tar.gz local | `b40f3e87da4256397af21d80ed8b8315fdd01b377f86d4aa4d83867fc5600b86` |

O modo da entrada no archive continua diferente entre local e runner (0664/0644), com JS e fontes idênticos. O asset publicado corresponde ao seu relatório e checksum.

A Application Rollouts preservou UID e spec comparados ao snapshot anterior à implantação e continua Synced/Healthy. Nenhum addon foi criado nesta atualização. Nenhuma alteração de DNS ou RBAC foi necessária nesta release.

## Validação e limites

Passaram `runtime:setup`, `npm ci`, `validate` e `evidence:check`: **45 testes de domínio/API/UI + 2 do harness de produção**. Os novos testes cobrem links diretos, histórico, edição de parâmetros e preservação das configurações ao voltar. npm audit: zero vulnerabilidades. Os charts não mudaram; os 12 renders Helm são evidência da v0.2.0.

O usuário confirmou que o catálogo **v0.2.0 funcionou**. Essa observação não valida automaticamente a navegação nova. Não houve interação observada em navegador real na **v0.2.1**; integração completa permanece **not-run**, com matriz vazia. Instalação do arquivo, rollout e bytes servidos estão verificados separadamente.

O histórico da implantação anterior foi preservado em `previousReleaseEvidence` no [registro estruturado](integration-evidence.json), incluindo a consulta autenticada por projeto e as correções de menu/permissão.
