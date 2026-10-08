# Homologação em VPS dedicada

## Escolha e estado

Ricardo escolheu **VPS dedicada** e confirmou **“Ainda vou contratar”** em 2026-10-08; ver
`docs/decisions/2026-10-08-production-unblock.md`. Provedor/região e dados da
máquina aguardam informação. M05/M14/M15/M16 continuam sem evidência real.

## Dados de entrada (sem segredos)

| Dado | Estado |
|---|---|
| Provedor, região e identificação da VPS | Pendente |
| IPv4/IPv6 ou nome do host | Pendente |
| vCPU, RAM e disco disponível | Pendente |
| Linux/distribuição/versão e arquitetura | Pendente; imagens atuais são construídas para Linux x86_64 |
| Domínio de homologação e responsável pelo DNS | Pendente |
| Usuário/porta SSH e forma de acesso por chave | Pendente; chave privada e senha nunca entram no chat/Git |
| VPS nova ou serviços/dados existentes a preservar | Pendente |
| Destino de backup fora da VPS e política de retenção | Pendente |
| Canal de alertas e segundo contato | Pendente; Ricardo é o contato primário |

Referência inicial de dimensionamento: 4 vCPU, 8 GB RAM e 80 GB SSD livres para
stack com IA/Qdrant desligados e observabilidade. É estimativa para homologação,
não garantia de capacidade; validar uso, disco, carga 3× e ajustar. Construir
imagens em CI, não na VPS. Não contratar um plano sem os dados/orçamento.

## Sequência executável após acesso

1. Inspecionar serviços, portas, disco e configuração existentes antes de mudar
   o host; preparar Docker Engine/Compose e acesso ao GHCR.
2. Apontar DNS ao host; expor somente HTTP/HTTPS pela borda Caddy, com SSH
   restrito aos operadores. PostgreSQL/Redis/observabilidade não têm portas
   publicadas no stack de referência.
3. Usar artefatos assinados do mesmo SHA com quality/security verdes; verificar
   assinatura adequada à ref usada no workflow. Preencher ambiente no host,
   sem segredos no repositório, IA/Qdrant desligados e dados sintéticos.
4. Executar migração/provisionamento e subida conforme
   `docs/operations/deploy.md`; confirmar health e smoke HTTPS real.
5. Exercitar cookie Secure, expiração/revogação, autorização/cross-scope e
   `TRUSTED_PROXIES` na topologia real, incluindo spoofing de headers.
6. Transportar backups verificados para destino externo; restaurar em alvo
   isolado e medir RPO ≤1 h / RTO ≤4 h. Backup no mesmo disco não prova
   recuperação de perda da VPS.
7. Configurar entrega real do webhook. Confirmar alerta disparado e resolvido
   ao parar/religar API conforme `docs/operations/alerting.md`; registrar tempos.
   Preparar configuração efetiva do Alertmanager no host: o arquivo de referência
   contém `${CVG_ALERT_WEBHOOK_URL}` e não é interpolado pelo Compose em um
   bind-mount. Renderizar o segredo no host ou usar arquivo de URL suportado,
   com ACL restrita; garantir egress do receptor (hoje na rede interna). A
   definição de Compose não prova entrega de alerta.
8. Executar carga, aceite manual e leitor de tela; registrar SHA, digests,
   head de migrations, resultados e limitações no estado/log/backlog.

Nenhum destes ensaios publica conteúdo clínico ou abre piloto automaticamente.
