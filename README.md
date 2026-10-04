# Addons — Argo CD System Level Extension

Extension React/TypeScript para **Argo CD 3.5.1**, registrada como **Addons** abaixo de Documentation. O caminho `/argo-rollouts` e o nome do arquivo são preservados para substituir o instalador existente sem duplicar o menu. Usa a sessão e a API do Argo CD; não armazena tokens.

## Jornada

1. Abra um card para acessar o detalhe do addon, como nas Applications: **Resumo**, **Parâmetros** e **Manifesto**. Edite nome, namespace, versão e parâmetros Helm; o editor JSON permite overrides avançados. **Voltar para Addons**, breadcrumb e links diretos (`?addon=kyverno`) e voltar/avançar do navegador mantêm a navegação. Alterações e seleção permanecem ao voltar à lista durante a sessão.
2. Selecione addons individuais ou os presets **Observabilidade**, **Istio Sidecar + observabilidade** e **Istio Ambient + observabilidade**. Dependências são selecionadas automaticamente.
3. Configure projeto, namespace das Applications, cluster e plataforma. O padrão `k3d` corresponde à instalação atual; ajuste para outros clusters. Cada addon permite nome, namespace, versão exata e overrides Helm em JSON.
4. Clique **Revisar instalação** e confira os manifestos. Somente **Instalar selecionados** cria Applications pela API, com `validate=true&upsert=false`, autosync, selfHeal e sem prune.
5. O preflight consulta toda a seleção com `projects=<projeto>` antes de escrever. Erros reais 401/403 e conflitos bloqueiam a criação. Applications existentes compatíveis são preservadas; versões Istio diferentes bloqueiam a composição da pilha. O catálogo não faz upgrades.
6. Cada dependência precisa estar **Synced + Healthy** antes da criação dos seus dependentes. Acompanhamento a cada cinco segundos, até 15 minutos; **Abrir Application** oferece diagnóstico nativo. **Atualizar status** só consulta.

Interromper o acompanhamento não remove Applications: elas continuam sincronizando no Argo CD. Após falha parcial ou recarga, selecione novamente para retomar. Somente HTTP 404 significa ausência. Cada requisição tem timeout de 20 segundos; o cliente respeita o base href e cancela requisições ao sair da página.

## Addons e versões

| Addon / componente | Chart | Versão |
| --- | --- | --- |
| Argo Rollouts | argo-rollouts | 2.43.5 |
| Kyverno | kyverno | 3.9.1 |
| External Secrets | external-secrets | 2.11.0 |
| Prometheus Operator, Prometheus e Alertmanager | kube-prometheus-stack | 91.9.0 |
| Grafana | grafana | 13.2.7 |
| Istio Base, istiod, CNI, ztunnel, ingress e egress | base / istiod / cni / ztunnel / gateway | 1.31.1 |
| Kiali | kiali-server | 2.32.0 |

Repositórios e notas estão em `src/features/catalog/addons.json`. Downloads oficiais e digests estão em [charts-audit.json](docs/charts-audit.json). Os 12 componentes foram renderizados com Helm para Kubernetes 1.35.3; [chart-render-validation.json](docs/chart-render-validation.json) registra os recursos. Isso valida templates, sem afirmar que todos os controllers foram instalados e exercitados.

Prometheus desativa o Grafana embutido para evitar instalação duplicada. Grafana e Kiali usam o Service do Prometheus selecionado; configure a URL global quando usar um servidor externo. Grafana usa senha gerada pelo chart, sem credencial embutida; Kiali exige token e opera em modo de leitura. Serviços são internos. Persistência e configuração de produção devem ser definidas nos overrides; os padrões dos charts podem usar armazenamento efêmero.

A pilha Istio inclui seus componentes Helm, gateways e observabilidade. Gateway API CRDs, waypoints, tracing, roteamento e inclusão de workloads no mesh exigem configuração posterior. O catálogo não rotula namespaces existentes. CNI ajusta caminhos por plataforma e exige acesso ao host. Os gateways usam ClusterIP para não conflitar com Traefik no k3d. Kyverno exige policies posteriores; External Secrets exige SecretStore/ClusterSecretStore e credenciais de provedor.

## Pré-requisitos e RBAC

O usuário precisa de `applications, get` e `applications, create` para o projeto e os nomes selecionados. O AppProject deve permitir todos os repositórios selecionados, destinos e recursos de cluster, incluindo CRDs, ClusterRoles, ClusterRoleBindings e Namespace. O controller precisa das permissões Kubernetes correspondentes. A extension não altera RBAC, projetos ou sync windows. Applications fora de argocd exigem suporte e allowlist no Argo CD.

Confira instalações já existentes antes de selecionar addons; `FailOnSharedResource=true` impede apropriação de recursos gerenciados por outras Applications. Instalações gerenciadas por outro mecanismo exigem análise de migração.

## Desenvolvimento e verificação

Node **26.7.0**, npm **11.19.0**; React/ReactDOM **19.2.6** são externos no bundle de produção e correspondem ao runtime auditado de v3.5.1.

```sh
npm run runtime:setup
npm ci
npm run dev
npm run validate
npm run evidence:check
```

Preview: `http://127.0.0.1:8080/?fixture=absent`, `?theme=dark` ou `?width=390px&height=844px`. Se a porta estiver ocupada, use `PREVIEW_PORT=18081 npm run dev`. O preview recompila ao editar; recarregue a página para ver alterações. Use `?api=forbidden` ou `?api=existing` para simular outros estados. O preview usa respostas simuladas da API; a produção usa a API same-origin do Argo CD. Asserções cobrem payload, registro, contexto imutável, ausência, RBAC, conflito de nomes, cancelamento, instalação e acompanhamento. A validação também verifica ausência de React embarcado, allowlist do pacote e renderização do bundle com os globals do host.

O gerador e o contrato estão registrados em `extension-project.json`; a auditoria exata de fontes está em `docs/host-contract.md`. `validation-report.json` vincula fontes, bundle e pacote por SHA-256. Esse relatório é evidência local; a instalação real tem evidência separada em `docs/integration.md`.

## Release no GitHub

`.github/workflows/ci.yml` valida pushes em `develop`/`main` e PRs. `.github/workflows/release.yml` valida e publica releases para tags `v*`, exigindo que a tag corresponda a `package.json`.

```sh
# Depois de atualizar a versão também no package-lock.json e commitar:
git tag v0.2.4
git push origin develop
git push origin v0.2.4
```

Assets publicados:

- `argo-rollouts-installer.tar.gz`, contendo somente `resources/extension-argo-rollouts-installer.js`;
- `checksums.txt`, com SHA-256 do tar.gz no formato consumido pelo installer;
- `argocd-server-patch.yaml`, com URLs ajustadas à tag/repositório da release;
- `validation-report.json`;
- `installation.md`, com o manual e comandos de patch.

O workflow usa `GITHUB_TOKEN` com `contents: write`, sem PAT adicional. As URLs fornecidas pressupõem repositório público. Para releases privadas, use os endpoints de assets da API do GitHub e o mecanismo de headers montados de Secret do installer.

A release **v0.2.4** adiciona a navegação lista/detalhe e parâmetros Helm editáveis, usando **Addons** no menu, e preserva as correções de registro React 19 e consulta por projeto. Veja [evidências de implantação e limites](docs/integration.md). A seleção de addons só instala controllers após o botão de confirmação.

## Instalar com argocd-extension-installer v1.1.0

Consulte o [manual de instalação](docs/installation.md), com comandos prontos de patch, verificação, permissões, atualização e remoção. O manual também acompanha a release como `installation.md`.

O patch fornecido usa a imagem oficial fixada por digest:

```
quay.io/argoprojlabs/argocd-extension-installer:v1.1.0@sha256:6cc786ba4dc96ba81d5010fbf92adabef15aff89753a55e22b8d829cd8b6e2a8
```

O volume `tmp` é compartilhado em `/tmp` entre o init container e `argocd-server`. `EXTENSIONS_DIR=/tmp/extensions/resources`; o installer extrai a pasta `resources` do tar.gz e copia o JS para esse diretório. O patch estratégico acrescenta o init container por nome e preserva outras extensions. A verificação de checksum fica habilitada e uma falha de instalação bloqueia a inicialização do novo pod.

Após a release estar disponível:

```sh
kubectl --context k3d-dev -n argocd patch deployment argocd-server \
  --type strategic --patch-file deploy/argocd-server-patch.yaml
kubectl --context k3d-dev -n argocd rollout status deployment/argocd-server
```

Para outra versão, prefira o patch anexado à release. Em outra instalação, ajuste namespace/nome do Deployment e volume: verifique os mounts existentes antes de aplicar. Instalações gerenciadas por Helm/GitOps devem incorporar o mesmo init container e mount à fonte de verdade para que uma reconciliação não reverta o patch. Não é necessário configurar um backend proxy.

Abra o Argo CD, recarregue a página e selecione **Addons** no menu lateral. Para remover a extension, remova apenas o init container `argocd-extension-installer-argo-rollouts` e reinicie o Deployment. Isso não remove Applications nem a instalação do Rollouts.

Referências oficiais: [contrato v3.5.1](https://github.com/argoproj/argo-cd/blob/v3.5.1/ui/src/app/shared/services/extensions-service.ts), [API de Applications](https://github.com/argoproj/argo-cd/blob/v3.5.1/server/application/application.proto), [chart Helm](https://github.com/argoproj/argo-helm/tree/argo-rollouts-2.43.5/charts/argo-rollouts), [installer v1.1.0](https://github.com/argoproj-labs/argocd-extension-installer/tree/v1.1.0).
