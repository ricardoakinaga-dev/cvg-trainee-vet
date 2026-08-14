# Evidência local de Web Vitals e carga delimitada — 2026-08-14

## Escopo

Esta evidência mede o runtime web/HA local atual e uma carga sintética delimitada. Não usa dados clínicos, contas reais, prontuários, fotos, PDFs de terceiros ou conteúdo identificável. Não substitui RUM de produção, UAT, soak aprovado ou SLO externo.

## Runtime

- source SHA executável: `16dcc2afda04866b1ecfaeb6017fe30bdadaa8be`;
- imagem comum: `cvg-trainee-vet:rc-head-16dcc2a`;
- digest: `sha256:55709f235fa8487dbd8d17727f4da175b3c73d6f0fe129b1fff997a1522c3402`;
- web: `http://127.0.0.1:3100/`;
- API edge local: `http://127.0.0.1:3180`;
- ambiente: `local-ha-web`, Chromium headless, serviço web systemd ativo, health `200/200`.

## Web Vitals observados no navegador

Playwright/Chromium abriu a página em dois viewports. `PerformanceObserver` capturou LCP, layout shift e eventos de interação; após 1,8 s houve um clique sintético no primeiro botão quando disponível. O INP abaixo é uma amostra de latência de evento da interação sintética, não RUM de usuários reais.

| Viewport | HTTP | LCP | CLS | INP proxy | DOMContentLoaded | Amostras de evento |
|---|---:|---:|---:|---:|---:|---:|
| Mobile 390×844 | 200 | 232 ms | 0 | 120 ms | 245,6 ms | 20 |
| Desktop 1440×900 | 200 | 172 ms | 0 | 144 ms | 91,9 ms | 20 |

Resultado local: `PASS` para a medição do runtime local, dentro dos budgets versionados (`LCP ≤ 2.500 ms`, `INP ≤ 200 ms`, `CLS ≤ 0,1`). O gate de Web Vitals reais continua `NOT_EXECUTED` para staging/produção porque não há janela RUM autorizada, coorte representativa, retenção ou SLO aprovado.

## Carga delimitada

Comando executado:

```text
CVG_LOAD_TARGET=http://127.0.0.1:3180/health/live CVG_LOAD_REQUESTS=20000 CVG_LOAD_CONCURRENCY=50 CVG_LOAD_TIMEOUT_MS=5000 pnpm ops:load-smoke
```

Resultado: `20.000/20.000` requests HTTP 200, `100%` de sucesso, concorrência `50`, throughput `889,41 req/s`, média `56,04 ms`, p95 `119,82 ms`, zero erros de rede.

Esta é uma carga delimitada local, não um soak: `soak de 24 horas`, saturação, fila sob carga, SLO produtivo, DR e failover externo permanecem pendentes e continuam classificados como `PASS_WITH_GAPS`/`NOT_EXECUTED` nos gates correspondentes.

## Próximos gates

- coletar Web Vitals retidos em staging/produção pública no RC congelado;
- executar matriz offline/slow-3G/reconexão e revisão com dispositivos representativos;
- aprovar e executar soak de 24 horas com telemetria de fila, latência, erros e recuperação;
- completar UAT, WCAG manual/screen reader, DR e reauditoria no mesmo release.
