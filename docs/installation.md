# Manual de instalação — Addons no Argo CD

Este manual instala a **UI extension Addons** no **Argo CD 3.5.1**, usando o **argocd-extension-installer v1.1.0**. Após a instalação, **Addons** aparece no menu lateral, abaixo de Documentation. Os controllers dos addons só são instalados quando você os seleciona e confirma na página.

## 1. Pré-requisitos

- Argo CD 3.5.1 com o Deployment `argocd-server`, container `argocd-server` e namespace `argocd`. Para outros nomes, ajuste os comandos e o patch.
- `kubectl` conectado ao cluster correto, com permissão para consultar e alterar esse Deployment, e `curl` para baixar o patch.
- Acesso dos pods a GitHub e seus hosts de download, com DNS funcional.
- Volume `tmp` do tipo `emptyDir`, compartilhado em `/tmp` com `argocd-server`, ou possibilidade de adicioná-lo. O patch configura esse volume e mount. Se já houver outro volume montado em `/tmp`, adapte o patch para compartilhar esse volume, sem sobrepor mounts.

Confira o contexto e a configuração existente:

```sh
kubectl config current-context
kubectl -n argocd get deployment argocd-server \
  -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{"\t"}{.image}{"\n"}{end}'
kubectl -n argocd get deployment argocd-server -o yaml
```

Confira os volumes, mounts e init containers. Em instalações gerenciadas por Helm/GitOps, incorpore o conteúdo do patch aos valores/manifests da fonte de verdade; uma reconciliação pode desfazer uma alteração manual.

## 2. Instalação rápida — comando de patch

Para o Deployment padrão descrito acima, copie este bloco. Ele baixa o patch oficial da **release v0.2.4**, aplica-o e aguarda o novo pod ficar disponível. Não é necessário clonar o repositório nem compilar a extension.

```sh
(
  set -eu
  curl --fail --silent --show-error --location --retry 3 \
    https://github.com/rodrigogeromin/argocd-system-ui-extension/releases/download/v0.2.4/argocd-server-patch.yaml \
    --output argocd-addons-patch.yaml

  kubectl -n argocd patch deployment argocd-server \
    --type strategic --patch-file argocd-addons-patch.yaml

  kubectl -n argocd rollout status deployment/argocd-server --timeout=180s
)
```

O arquivo baixado fica disponível para revisão e uso na sua fonte de verdade. Para revisar antes de aplicar, execute apenas o `curl`, abra `argocd-addons-patch.yaml` e depois execute os comandos `kubectl`.

No ambiente deste projeto, acrescente `--context k3d-dev` aos comandos `kubectl`. Os comandos acima usam o contexto atual para facilitar a instalação em outros ambientes.

### O que o patch configura

- Init container `argocd-extension-installer-argo-rollouts`, com imagem oficial v1.1.0 fixada por digest.
- URLs do tar.gz e do checksum fixadas na mesma release v0.2.4; a verificação de checksum permanece habilitada.
- Volume compartilhado `tmp` em `/tmp` e destino `/tmp/extensions/resources`.
- Um único arquivo `extension-argo-rollouts-installer.js`, substituindo a versão anterior sem duplicar o menu.

O nome legado do container e do arquivo é intencional. O patch estratégico combina containers por nome e mounts por caminho, preservando as outras extensions na configuração padrão. Applications, AppProjects e RBAC não são alterados. O Deployment reinicia os pods para executar os init containers; o patch pode ser reaplicado para a mesma versão.

## 3. Verificar e abrir Addons

```sh
kubectl -n argocd get pods -l app.kubernetes.io/name=argocd-server
kubectl -n argocd logs deployment/argocd-server \
  -c argocd-extension-installer-argo-rollouts
kubectl -n argocd exec deployment/argocd-server -c argocd-server -- \
  ls /tmp/extensions/resources
```

O novo pod deve estar Ready. O installer deve registrar `UI extension installed successfully`, após validar o checksum, e o diretório deve conter `extension-argo-rollouts-installer.js`.

Abra o Argo CD e recarregue com **Ctrl+Shift+R**. Clique em **Addons** no menu lateral. Abra um addon para acessar **Resumo**, **Parâmetros** e **Manifesto**; use o botão discreto **Voltar para Addons** para retornar à lista. Selecione addons ou presets, revise as Applications e confirme **Instalar selecionados**.

## 4. Permissões para instalar os addons

Instalar a UI extension e criar Applications são operações diferentes. Para o botão de instalação funcionar:

- A sessão do usuário deve permitir `applications, get` e `applications, create` no projeto/names dos addons selecionados. Em Applications in any namespace, a regra também deve abranger o namespace da Application.
- O AppProject deve permitir os repositórios Helm selecionados, o cluster/namespace de destino e os recursos de cluster necessários, incluindo CRDs e RBAC.
- O controller do Argo CD deve poder aplicar esses recursos no cluster; sync windows também devem permitir a sincronização.

O padrão é projeto `default`, Applications em `argocd` e cluster local. Ajuste o destino na própria página. A extension usa a sessão do Argo CD; não exige token no patch e não amplia permissões automaticamente. Applications existentes são preservadas; upgrades e alterações de instalações existentes seguem pela página nativa de Applications.

## 5. Diagnóstico

| Sintoma | Como verificar |
| --- | --- |
| Pod em Init:Error / Init:CrashLoopBackOff | Consulte os logs do init container do pod novo. Verifique DNS, acesso às URLs da release e checksum. |
| Addons não aparece | Confira o arquivo no pod novo, conclusão do rollout e recarregue a página sem cache. Confirme Argo CD 3.5.1. |
| permission denied ao consultar/criar | Confira a sessão, projeto selecionado e RBAC. Um 403 real interrompe a instalação; não é tratado como Application ausente. |
| Application criada, addon não saudável | Abra a Application para examinar erros de sync, permissões do AppProject/controller e requisitos do chart. Dependentes aguardam Synced/Healthy. |
| Patch desaparece depois | Integre o init container e o volume à fonte Helm/GitOps que gerencia o Deployment. |

Se houver mais de um pod durante o rollout, use `kubectl logs POD_NOVO -c argocd-extension-installer-argo-rollouts` para evitar consultar os logs da versão anterior.

## 6. Atualização e reversão

Para atualizar, use o patch anexado à release desejada e aguarde o rollout. Para voltar a uma versão anterior, aplique o patch daquela release. Para remover somente a UI extension:

```sh
kubectl -n argocd patch deployment argocd-server --type strategic \
  --patch '{"spec":{"template":{"spec":{"initContainers":[{"name":"argocd-extension-installer-argo-rollouts","$patch":"delete"}]}}}}'
kubectl -n argocd rollout status deployment/argocd-server --timeout=180s
```

Isso remove somente o init container da extension; mantém o volume e as outras extensions. Como o JS fica em emptyDir, ele desaparece nos novos pods. Os addons e suas Applications continuam instalados. Em Helm/GitOps, faça a mesma remoção na fonte de verdade.

Referências: [release com assets](https://github.com/rodrigogeromin/argocd-system-ui-extension/releases/tag/v0.2.4), [patch do projeto](../deploy/argocd-server-patch.yaml), [installer oficial v1.1.0](https://github.com/argoproj-labs/argocd-extension-installer/tree/v1.1.0), [contrato System Level do Argo CD v3.5.1](https://github.com/argoproj/argo-cd/blob/v3.5.1/ui/src/app/shared/services/extensions-service.ts).
