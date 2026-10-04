# Evidência de implantação — v0.2.4

Verificado em 2026-10-04: Argo CD **3.5.1**, System Level, fonte oficial **v3.5.1**, contexto **k3d-dev**, namespace **argocd**. Contrato validado pela skill instalada; runtime e registro preservados.

A [release v0.2.4](https://github.com/rodrigogeromin/argocd-system-ui-extension/releases/tag/v0.2.4) reduz o botão de voltar para texto de 12px, padding de 4px/6px e borda transparente, com foco de teclado preservado. Inclui o [manual de instalação](installation.md), também publicado como asset `installation.md`. [Release](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37200590365) e [CI](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37200588824) passaram. Implementação `9ae3ca6` enviada a develop.

Os blocos shell do manual passaram na validação de sintaxe. O patch foi aceito em dry-run pelo Kubernetes. Depois da publicação, o comando de instalação rápida do próprio manual foi executado, apenas acrescentando `--context k3d-dev`, e concluiu o rollout. O manual baixado corresponde exatamente ao arquivo do repositório.

O pod `argocd-server-b5bc58f6-bx2tj` está Ready, ambos os installers terminaram com código 0 e o checksum foi validado. `/api/version` confirmou v3.5.1, e `/extensions.js` contém os bytes exatos do bundle publicado. A outra extension service-catalog foi preservada.

| Identidade | SHA-256 |
| --- | --- |
| Fontes | `47d8961180918f7346331d4f9f12b9859cf224884b2f19cebbf12dc47bf7ffe4` |
| Bundle instalado/servido | `76a981f5182577f536fe3648eaac3a17cfe52e8188fe2c33c08f674941893289` |
| tar.gz publicado | `74aa751a93d45340d04d33aaeb483b92ce257c8b2cfd004f43ce3caae3640e0e` |
| tar.gz local | `2134952da6446f4ac0bb45accbb779365570cc8b8e4a4fdd0d460ba0d2595975` |

Fontes e conteúdo JS local/release são idênticos; o modo do arquivo no archive difere (0664/0644). O asset publicado corresponde ao seu checksum e relatório.

Passaram validate/evidence:check e o npm ci do CI: **45 testes de domínio/API/UI + 2 do harness**. A aparência compacta não foi observada em navegador real; integração permanece **not-run**, com matriz vazia. Deploy e bytes servidos estão verificados separadamente. Nenhum controller de addon foi instalado nesta atualização.

O histórico anterior está preservado no [registro estruturado](integration-evidence.json).
