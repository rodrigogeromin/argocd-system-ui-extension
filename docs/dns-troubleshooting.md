# Correção de DNS do k3d-dev — repositórios Helm

Em 2026-10-04, a criação da Application External Secrets falhou com HTTP 400 e `lookup charts.external-secrets.io on 10.43.0.10:53: server misbehaving`.

O erro ocorreu no acesso ao repositório pelo Argo CD: CoreDNS encaminhava consultas externas para `172.18.0.1`, cujo DNS não respondia. Esse endereço constava no resolv.conf do nó, com referências antigas de upstream Docker. Os DNS atuais do host, `8.8.8.8` e `8.8.4.4`, responderam normalmente.

## Ajuste aplicado

O ConfigMap `kube-system/coredns` passou a usar:

```text
forward . 8.8.8.8 8.8.4.4
```

Os demais plugins e os dados NodeHosts foram preservados. O CoreDNS recarregou a configuração automaticamente, sem reiniciar o pod. O arquivo resolv.conf do container `k3d-dev-server-0` também foi ajustado para esses DNS, permitindo a resolução externa pelo runtime ao baixar imagens.

A correção foi mantida aplicada. Ela não altera ConfigMaps do Argo CD e não faz parte dos requisitos da UI extension.

O patch versionado reproduz a alteração do Corefile **deste ambiente k3d-dev**:

```sh
kubectl --context k3d-dev -n kube-system patch configmap coredns \
  --type merge --patch-file deploy/k3d-coredns-patch.json
```

Esse arquivo contém o Corefile observado neste cluster. Em outro ambiente, preserve os plugins e zonas próprios e use os DNS adequados à rede. O ConfigMap permanece entre reinícios dos pods; se K3s/GitOps recriar sua configuração, incorpore a alteração à fonte de infraestrutura ou reaplique o patch. A mudança no resolv.conf do nó existente deve ser incorporada à configuração de criação do cluster quando o container do nó for recriado.

## Verificação realizada

- `charts.external-secrets.io` resolveu pelo DNS do cluster `10.43.0.10`.
- `kubernetes.default.svc.cluster.local` e `argocd-repo-server.argocd.svc.cluster.local` continuaram resolvendo internamente.
- Dentro do `argocd-repo-server`, Helm conseguiu acessar o índice e baixar o chart `external-secrets` **2.11.0**.
- CoreDNS permaneceu Ready e registrou `Reloading complete`.

Para reproduzir a verificação de acesso ao chart:

```sh
kubectl --context k3d-dev -n argocd exec deployment/argocd-repo-server \
  -c argocd-repo-server -- helm show chart external-secrets \
  --repo https://charts.external-secrets.io --version 2.11.0
```

A investigação não criou a Application nem instalou o controller. Após corrigir o DNS, repita **Instalar selecionados** na página Addons. Nenhuma mudança de URL do chart ou de RBAC é necessária para resolver esse erro de DNS.

O [registro das verificações](dns-repair-evidence.json) mantém a evidência separada da implantação da UI extension. Referência oficial: [serviços de rede e CoreDNS no K3s](https://docs.k3s.io/networking/networking-services#coredns).
