# 0413 — Logs Audit

Resultado: PARTIAL no recorte F3-S3 + complementos F3-S5/F3-S6 — logger JSON redigido, sink padrão, allowlist, correlação de API/worker, telemetria de rejeições de borda e teste negativo foram construídos; retenção, acesso controlado ao sink e correlação distribuída ponta a ponta ainda não.

## Checklist

- [x] JSON estruturado com timestamp, serviço, nível, evento e duração;
- [x] `request_id` e `correlation_id` são emitidos na API; o worker propaga correlação do evento quando disponível;
- [ ] erro inclui código público e contexto interno redigido;
- [x] ações sensíveis continuam com auditoria separada;
- [x] logs não incluem senha, token, cookie, API key, prompt, resposta IA, fonte, PDF, foto, gabarito ou dado real;
- [ ] retenção e acesso ao sink estão definidos;
- [x] teste negativo de redaction passa.

Evidência parcial: apiErrorResponse, toApplicationError, scans de segredo e testes de não exposição não substituem logs estruturados.

## Nível

`PARTIAL`: estrutura, correlação local e redaction passam; retenção, acesso mínimo ao sink e reprodução de incidente distribuído aguardam a integração operacional.
