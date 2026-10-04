# Evidência de implantação — v0.2.5

Verificado em 2026-10-04: Argo CD **3.5.1**, System Level, fonte oficial **v3.5.1**, contexto **k3d-dev**, namespace **argocd**. Contrato validado pela skill instalada; runtime e registro preservados.

A [release v0.2.5](https://github.com/rodrigogeromin/argocd-system-ui-extension/releases/tag/v0.2.5) consulta automaticamente os status ao abrir Addons e ao mudar projeto, destino ou identidade das Applications. Mostra carregamento, mantém atualização manual, cancela consultas ao sair ou instalar e ignora respostas antigas. A consulta não cria Applications. [Release](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37201509257) e [CI](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37201508091) passaram; commit `becd78b` enviado a develop.

O pod `argocd-server-6f77c4c55c-kq7kq` está Ready, ambos os installers terminaram com código 0 e o rollout concluiu. Checksum validado. `/api/version` confirmou v3.5.1, e `/extensions.js` contém os bytes exatos do bundle publicado. A outra extension service-catalog foi preservada.

| Identidade | SHA-256 |
| --- | --- |
| Fontes | `096b3e7df25f70e9da68d0522f36eac00c0de12f0112a3bd55f65710e9d0d3cf` |
| Bundle instalado/servido | `20e7c8ba5d0fd7683e63c62105c959f5c23f8f7c4eb7a1946466ba3a99a8002c` |
| tar.gz publicado | `cefe2c239415926818272d7502936299a4bc90a2b1c180fe5bc8d2bf3a56a60a` |
| tar.gz local | `5e96d6e75915dce6b9de2fcb4773d22f41ef391a7e639c63e814fee56d42c6a8` |

Fontes e JS local/release correspondem; o modo do arquivo no archive difere (0664/0644). O asset publicado corresponde ao checksum e relatório. O manual anexado corresponde ao arquivo do repositório.

Uma consulta real autenticada como admin retornou 200/Synced/Healthy para Rollouts e 404 para os outros 11 nomes, com `projects=default`. Nenhum addon foi criado; UID e spec do Rollouts foram preservados em comparação ao snapshot anterior. Credenciais usadas somente em memória. RBAC não foi alterado.

## Intercorrência de DNS

O novo pod encontrou timeouts na resolução de github.com e quay.io. Houve ajuste temporário dos resolvers CoreDNS e do nó k3d-dev-server-0, usando upstreams acessíveis; o pod que falhou foi substituído e o pull da imagem confirmou sucesso. As duas configurações originais foram restauradas e comparadas ao backup. O rollout final concluiu. A atualização da extension não inclui uma alteração permanente de DNS; a falha intermitente observada na infraestrutura pode exigir diagnóstico separado.

## Validação e limites

Passaram validate/evidence:check e o npm ci do CI: **48 testes de domínio/API/UI + 2 do harness**. Os testes exercitam descoberta sem clicar, troca de projeto com resposta antiga pendente, refresh manual, cancelamento ao desmontar e cancelamento antes da instalação. O harness confirma GETs autenticados por cookie, sem POST automático.

`cua.getState` não disponibilizou navegador. A interação real da página permanece **not-run**, com matriz vazia. Testes simulados, consultas reais da API, deploy e bytes servidos são evidências separadas. O histórico está preservado no [registro estruturado](integration-evidence.json).
