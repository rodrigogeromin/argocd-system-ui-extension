# Evidência de implantação — v0.2.3

Verificado em 2026-10-04: Argo CD **3.5.1**, System Level, fonte oficial **v3.5.1**, contexto **k3d-dev**, namespace **argocd**. Contrato validado pela skill instalada; runtime e registro preservados.

A [release v0.2.3](https://github.com/rodrigogeromin/argocd-system-ui-extension/releases/tag/v0.2.3) adiciona o botão **Voltar para Addons** no topo do detalhe. O teste de edição/retorno agora usa esse botão e confirma preservação de parâmetros e seleção. Os [checks da release](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37199985497) e o [CI](https://github.com/rodrigogeromin/argocd-system-ui-extension/actions/runs/37199984426) passaram. Commits: `6acd8df` (botão), `aa94988` (correção do lockfile), enviados a develop.

O patch da release atualizou o installer existente e preservou service-catalog. O pod `argocd-server-8465d8578c-ffmfh` está Ready; ambos os installers terminaram com código 0 e o rollout concluiu. Checksum validado, `/api/version` confirmou v3.5.1, e `/extensions.js` contém os bytes exatos do bundle publicado.

| Identidade | SHA-256 |
| --- | --- |
| Fontes | `fbacded8768c948b5d351c0b2fe189df61b100a88702620298577d15f02cdeef` |
| Bundle instalado/servido | `9e660931678ff9ce198b798720532fd4d915e127830e5d8d9ebd379feb7b64f2` |
| tar.gz publicado | `34e28f1d5682af1a55de4df6abc654686dc20ecfd23747a27e894f475c277ff7` |
| tar.gz local | `518d1485d75e8f1d7843ba463020614ce7700a9d0ce1f92ac3657d7b4fa2be42` |

Fontes e JS local/release correspondem; o modo do arquivo no archive difere (0664/0644). O asset publicado confere com seu checksum e relatório. A tentativa v0.2.2 falhou no npm ci após uma substituição ampla de versão alterar referências de dependências; nenhuma release ou implantação dessa versão ocorreu. A v0.2.3 restaurou as dependências e atualizou apenas as versões raiz.

Passaram `npm ci`, `validate` e `evidence:check`: **45 testes de domínio/API/UI + 2 do harness**, sem vulnerabilidades no npm audit. A UI real do botão não foi observada em navegador; integração permanece **not-run**, com matriz vazia. Deploy, init containers e bytes servidos estão verificados separadamente. Nenhum addon foi instalado por esta atualização.

O histórico das releases anteriores está preservado no [registro estruturado](integration-evidence.json).
