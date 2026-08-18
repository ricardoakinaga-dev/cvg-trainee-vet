# Evidência Dual 95 — U95-102 — Observabilidade operacional

**Data:** 2026-08-16  
**Ambiente:** Compose HA local `cvg-trainee-vet-ha`, dados sintéticos  
**Status:** `LOCAL_PASS_WITH_LIMITATIONS`  
**Escopo:** fechar localmente `D95-H02`; não é promoção, release, score ou autorização de piloto.

## RED → GREEN

O teste focal foi criado para exigir segredo preparado para o UID não-root do
Prometheus, healthchecks de Prometheus/Alertmanager e dependências por saúde. O
RED inicial foi `1 failed / 5 passed` em
`tests/integration/production-edge-contract.test.ts`, por ausência de
`prometheus-secret-init`.

O GREEN introduziu:

- helper one-shot `prometheus-secret-init`, sem rede, filesystem read-only e
  somente `CHOWN`, `DAC_READ_SEARCH` e `FOWNER`, que copia o segredo para um
  volume derivado como `65534:65534` e modo `0440`;
- Prometheus executando como `65534:65534`, lendo apenas o volume derivado;
- readiness healthchecks para Prometheus e Alertmanager;
- Prometheus aguardando conclusão do helper, API A/B, worker A/B e
  Alertmanager saudável;
- Grafana aguardando Prometheus saudável;
- verificador de topologia exigindo a presença e os gates acima.

## Evidência negativa e positiva

| Controle | Antes | Depois |
| --- | --- | --- |
| permissão do token | processo `nobody`, arquivo montado `1000:1000 0600`, `readable=1` | arquivo derivado `65534:65534 0440`, `readable=0` para `nobody` |
| scrape sem credencial | `401 Unauthorized` | permanece `401 Unauthorized` |
| scrape com credencial | não funcional no runtime anterior | API e worker aceitos; targets `up` |
| rules | `/api/v1/rules` com `0` grupos | `cvg.operational` com `7` regras, todas `health=ok` |
| Alertmanager | `/api/v1/alertmanagers` sem destinos | `http://alertmanager:9093/api/v2/alerts` ativo |

Targets finais observados: `api-a:3000`, `api-b:3000`, `worker-a:9091`,
`worker-b:9091` e `otel-collector:8889`; todos `health=up` e sem `lastError`.

## Fire → ack → resolve

Foi enviado somente o alerta sintético `D95SyntheticObservabilityRC`, sem
payload clínico:

1. `active`, roteado para `cvg-operations`;
2. `suppressed`, com `silencedBy` preenchido pela silence de acknowledgement;
3. após atualização com `endsAt`, não permaneceu em `/api/v2/alerts?active=true`.

O receiver local não possui destino externo; portanto, esta prova valida o
roteamento e o ciclo interno do Alertmanager, não notificação de produção.

## Verificações executadas

- `pnpm exec vitest run tests/integration/production-edge-contract.test.ts --project integration`: `6/6`;
- `pnpm ops:verify-ha`: `PASS`;
- `pnpm build` com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182`: `PASS`;
- imagem local reconstruída e API A/B + worker A/B recriados; os quatro ficaram `healthy`;
- `promtool check config /etc/prometheus/prometheus.yml`: `SUCCESS`;
- `promtool check rules /etc/prometheus/prometheus-alerts.yml`: `7 rules found`;
- `promtool check metrics` contra o scrape autenticado de `api-a`: exit `0`;
- `amtool check-config /etc/alertmanager/alertmanager.yml`: `SUCCESS`;
- `CLINICAL_APPROVER_ID=local-verification-approver TRUSTED_PROXY_CIDRS=127.0.0.1/32 pnpm verify`: `177` arquivos, `792` testes aprovados, `18` skips governados; cobertura `84,86%` statements / `80,17%` branches / `87,18%` functions / `85,69%` lines;
- `pnpm exec prettier --check` nos arquivos alterados: `PASS`;
- `git diff --check`: `PASS`;
- `pnpm verify:secrets`: `secret scan: clean`.

## Limitações e continuidade

O ambiente continua local/LAN, sem registry, CI, destino externo de alertas,
on-call, retenção externa, assinatura ou promoção. O volume derivado de segredo
deve ser repopulado pelo helper durante rotação autorizada antes de reiniciar o
Prometheus. As baselines `83,24/100` e `64,20/100`, `0/145` cadeias e
`PILOT_BLOCKED` permanecem inalteradas. A revalidação do mesmo RC após commit,
artefato imutável e ambiente externo continua obrigatória.
