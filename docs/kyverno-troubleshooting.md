# Kyverno Healthy/OutOfSync e metadados vazios em CRDs

Na instalação do chart Kyverno 3.9.1, os controllers estavam Healthy e a sincronização havia terminado com Succeeded. A Application continuava OutOfSync porque 11 CRDs `*.policies.kyverno.io` eram renderizadas com `metadata.annotations: {}` e `metadata.labels: {}`, enquanto o Kubernetes omitia esses mapas vazios.

A comparação dos estados normalizado e previsto pela API do Argo CD confirmou somente esses dois caminhos como diferentes em cada uma das 11 CRDs.

## Correção da comparação

A Application Kyverno recebeu esta regra adicional em `spec.ignoreDifferences`, preservando as regras existentes:

```yaml
- group: apiextensions.k8s.io
  kind: CustomResourceDefinition
  jqPathExpressions:
    - 'select(.metadata.name | endswith(".policies.kyverno.io")) | .metadata.annotations | select(. == {})'
    - 'select(.metadata.name | endswith(".policies.kyverno.io")) | .metadata.labels | select(. == {})'
```

A expressão remove apenas os mapas vazios na normalização de CRDs com o sufixo observado. Metadados preenchidos, schemas e outras CRDs continuam sendo comparados. A regra foi verificada com jq usando exemplos de mapas vazios, metadados preenchidos, outra CRD e alterações de schema.

Após um hard refresh, a Application passou para **Synced/Healthy** e as CRDs deixaram de apresentar o diff observado. A versão, os values, o destino e as regras anteriores da Application foram preservados. A correção é específica da Application; não requer configuração global em argocd-cm.

Novas Applications Kyverno criadas pela extension v0.2.6 já incluem a regra. A atualização do JS preserva Applications existentes; nesta instalação, a regra foi acrescentada diretamente à Application existente.

## Indicação no catálogo

A UI antiga utilizava Synced/Healthy para indicar Instalado. Agora uma instalação Healthy com OutOfSync aparece como **Instalado**, com o status de sync e a mensagem sobre diferenças visíveis no card.

A espera de dependências e a conclusão da instalação seguem exigindo **Synced/Healthy**, sem operação em andamento ou erro. Essa indicação na UI não libera antecipadamente componentes dependentes.

Referência: [normalização de diferenças por Application](https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/#application-level-configuration).
