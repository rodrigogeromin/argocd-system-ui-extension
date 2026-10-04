# Evidência de integração

Alvo descoberto: contexto Kubernetes `k3d-dev`, namespace `argocd`, Deployment `argocd-server`, imagem `quay.io/argoproj/argocd:v3.5.1`. A API `/api/version` confirma `v3.5.1` via port-forward do Service.

A implantação usa um init container adicional do installer v1.1.0, compartilhando o volume `tmp` já montado no server. A extension `service-catalog` existente é preservada.

A instalação e os hashes servidos serão registrados após a publicação da release. A validação local não certifica integração: sua matriz permanece vazia e `releaseComplete` permanece `false`.

Não há navegador disponível no conector de computer use desta sessão. Registro, renderização, criação e acompanhamento são exercitados pelo harness/testes locais; interação real no navegador e instalação do controller Rollouts pelo botão ainda não foram observadas.
