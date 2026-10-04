# Argo Rollouts Installer — Argo CD System Level Extension

Extension React/TypeScript para **Argo CD 3.5.1**, registrada como página **System Level** em **Argo Rollouts**, no menu lateral (`/argo-rollouts`). Usa a sessão e a API do Argo CD para instalar o controller do Argo Rollouts através de uma Application Helm.

## Jornada

1. Configure nome, projeto, namespace da Application, cluster cadastrado, namespace de destino, versão exata do chart, réplicas e dashboard opcional.
2. Expanda **Manifesto que será enviado à API** e revise a Application.
3. Clique **Instalar Argo Rollouts**. A extension consulta a Application antes de criar e envia `POST /api/v1/applications?validate=true&upsert=false` com o manifesto diretamente no body.
4. A Application usa `https://argoproj.github.io/argo-helm`, chart `argo-rollouts`, versão padrão **2.43.5** (Rollouts **v1.10.0**). Helm instala CRDs e RBAC de cluster; o Argo CD cria o namespace e sincroniza automaticamente. `selfHeal: true`, `prune: false`.
5. A página acompanha a Application a cada cinco segundos e só mostra conclusão quando estiver **Synced + Healthy**, sem erro de operação ou condição de erro. **Abrir Application** leva ao diagnóstico nativo do Argo CD.

**Consultar instalação** retoma o acompanhamento após recarregar a página, sem criar recursos. Uma Application existente nunca é sobrescrita; a UI apresenta sua versão e destino reais. Se o nome pertencer a outra source, escolha outro nome. Em erro de rede após a criação, consulte novamente antes de instalar. Os parâmetros de uma Application existente ficam bloqueados; alterações e upgrades seguem a gestão normal da Application.

O dashboard opcional é instalado como Service interno, sem publicação de ingress. Não são armazenados tokens nem credenciais. O cliente respeita `<base href>` para instalações do Argo CD em subpaths, valida respostas, limita cada chamada a 20 segundos e cancela o acompanhamento ao sair da página. 401/403 exibem erro de sessão/permissão; somente 404 é tratado como ausência.

## Pré-requisitos e RBAC

O usuário precisa de `applications, get` e `applications, create` para `<projeto>/<application>` (ou `<projeto>/<namespace-application>/<application>` em modo Applications in any namespace). A extension não altera RBAC nem cria AppProjects. `sync` manual ocorre pela UI nativa e exige a permissão correspondente; a criação configura autosync no controller.

O AppProject precisa permitir o repositório `https://argoproj.github.io/argo-helm`, o cluster/namespace de destino e os recursos renderizados pelo chart, incluindo CRDs, ClusterRoles, ClusterRoleBindings e Namespace. O controller do Argo CD precisa de permissão Kubernetes para aplicá-los. Não há bypass de restrições do projeto, de RBAC ou de sync windows. Para Applications fora de `argocd`, configure o suporte e a allowlist de namespaces no próprio Argo CD.

Não crie uma segunda instalação se o cluster já tiver um controller Rollouts gerenciado por outro mecanismo; confira os recursos e escolha o fluxo de migração apropriado.

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
git tag v0.1.1
git push origin develop
git push origin v0.1.1
```

Assets publicados:

- `argo-rollouts-installer.tar.gz`, contendo somente `resources/extension-argo-rollouts-installer.js`;
- `checksums.txt`, com SHA-256 do tar.gz no formato consumido pelo installer;
- `argocd-server-patch.yaml`, com URLs ajustadas à tag/repositório da release;
- `validation-report.json`.

O workflow usa `GITHUB_TOKEN` com `contents: write`, sem PAT adicional. As URLs fornecidas pressupõem repositório público. Para releases privadas, use os endpoints de assets da API do GitHub e o mecanismo de headers montados de Secret do installer.

A release **v0.1.1** corrige o registro do menu durante a montagem assíncrona do React 19. A evidência de implantação indica a versão instalada no Argo CD 3.5.1 do contexto **k3d-dev**. Veja [evidências e limites](docs/integration.md). A instalação do controller Rollouts é acionada pelo botão da página.

## Instalar com argocd-extension-installer v1.1.0

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

Abra o Argo CD, recarregue a página e selecione **Argo Rollouts** no menu lateral. Para remover a extension, remova apenas o init container `argocd-extension-installer-argo-rollouts` e reinicie o Deployment. Isso não remove Applications nem a instalação do Rollouts.

Referências oficiais: [contrato v3.5.1](https://github.com/argoproj/argo-cd/blob/v3.5.1/ui/src/app/shared/services/extensions-service.ts), [API de Applications](https://github.com/argoproj/argo-cd/blob/v3.5.1/server/application/application.proto), [chart Helm](https://github.com/argoproj/argo-helm/tree/argo-rollouts-2.43.5/charts/argo-rollouts), [installer v1.1.0](https://github.com/argoproj-labs/argocd-extension-installer/tree/v1.1.0).
