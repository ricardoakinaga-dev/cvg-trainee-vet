# Roteiro UAT e WCAG 2.2 AA manual — CVG

> **Objetivo:** fechar os 5 gaps manuais de acessibilidade
> (`accessibility-governance.json`) e os 4 gaps manuais de Web Vitals, com
> usuários representativos reais, em ambiente de staging autorizado.
>
> **Status:** roteiro de validação. Não é evidência de execução; cada item só se
> torna evidência quando executado, registrado e retido no mesmo RC.

## Princípios

- UAT usa **dados sintéticos** e consentimento; nunca dados clínicos reais,
  prontuários, tutores, fotos ou PDFs.
- WCAG manual é executado por especialista (ou par treinado) com matrix
  aprovada; axe automatizado já cobre a base (`A11Y-AXE-006`), não substitui.
- Toda descoberta Sev1/Sev2 reabre o workstream até correção + reteste.

## 1. Papéis e jornadas P0

| Papel | Jornadas P0 |
|---|---|
| Participante | convite → login → atividade → resposta → submissão → próxima ação |
| Aprovador clínico | fila de revisão → abrir item → decidir (aprovar/ajustes) |
| Moderador | dashboard → estatística/anomalia de item |
| Administrador | lifecycle de contas → suspensão/reativação → revogação de sessão |

Cada jornada é testada por turno (clínico/administrativo) e por dispositivo
(desktop e mobile).

## 2. Matriz de ambiente/dispositivo

| Projeto | Dispositivo | Estado |
|---|---|---|
| Chromium (desktop) | 1440×900 | a executar |
| Firefox (desktop) | 1440×900 | a executar |
| WebKit/Safari | 1366×768 | bloqueado hoje (`libavif16`) |
| Mobile (viewport) | 390×844 | a executar |

> WebKit exige ambiente com `libavif16` (plataforma/QA); registrar como
> `NOT_EXECUTED` até o provisionamento, nunca como PASS.

## 3. Checklist WCAG 2.2 AA manual (fecha A11Y-MANUAL-001 a 005)

Para **cada superfície P0**, verificar:

### Foco e teclado
- [ ] tab order lógica e visível; foco nunca preso;
- [ ] skip-link funcional (já automatizado, revalidar manual);
- [ ] todos os alvos interativos alcançáveis por teclado;
- [ ] `:focus-visible` perceptível em todos os componentes.

### Contraste e texto (A11Y-MANUAL-002)
- [ ] texto normal ≥ 4,5:1 e grande ≥ 3:1 (corrigir ~2,91:1/3,1:1 já detectados);
- [ ] contraste de elementos não-texto (ícones, bordas de campo, foco) ≥ 3:1;
- [ ] mensagens de erro com contraste adequado.

### Zoom, reflow e motion (A11Y-MANUAL-003)
- [ ] zoom 200% e 300% sem perda de função (reflow);
- [ ] viewport 320px sem scroll horizontal;
- [ ] `prefers-reduced-motion` respeitado em animações/transições.

### Screen reader (A11Y-MANUAL-004)
- [ ] NVDA (Windows) ou VoiceOver (macOS) nas jornadas P0;
- [ ] nomes/róis/estados anunciados corretamente;
- [ ] mensagens de erro/status anunciadas (`role=alert/status`);
- [ ] formulários com `label`/`aria-describedby` coerentes.

### Usuários representativos (A11Y-MANUAL-005)
- [ ] tarefas consentidas executadas por papel;
- [ ] achados registrados, reproduzidos e priorizados;
- [ ] P0/P1 re-testados após correção.

## 4. UAT funcional (aceite por papel)

Critérios de aceite: **100% das tarefas críticas** e **≥98% do total** sem
erro bloqueante; cada falha tem causa classificada (dado, fluxo, ambiente).

| # | Tarefa crítica | Papel | Aceite |
|---|---|---|---|
| 1 | concluir uma atividade completa | participante | sem erro bloqueante |
| 2 | decidir um item da fila (aprovar/ajustes) | aprovador | decisão persistida |
| 3 | visualizar dashboard e KPIs | moderador | dados corretos |
| 4 | suspender e revogar sessão de conta | administrador | sessão invalidada |
| 5 | retomar sessão após interrupção | participante | estado preservado |

## 5. Web Vitals reais (RUM) — fecha os 4 gaps manuais

| Métrica | Alvo (p75) | Método |
|---|---|---|
| LCP | ≤ 2500 ms | RUM em coorte representativa |
| INP | ≤ 200 ms | RUM |
| CLS | ≤ 0,1 | RUM |

- Coletar em janela autorizada com retenção aprovada (não é smoke local);
- medir também por dispositivo (desktop/mobile) e por turno;
- CI de budget só é vinculado depois de RUM retido (não por medição sintética).

## 6. Registro e evidência

- Cada execução registra: tarefa, papel, dispositivo, resultado, timestamp,
  achado (redigido), e o RC/SHA do ambiente;
- achados Sev1/Sev2 entram em `docs/30_backlog_master.md` e reabrem o workstream;
- nada de dado real, PII ou conteúdo clínico é retido.

## 7. Gate de saída

Fechar UAT/WCAG quando:
- 5 gaps manuais de a11y → `PASS` (ou achado com owner/prazo aceito);
- 4 gaps manuais de Vitals → RUM retido dentro dos alvos;
- matriz de dispositivos executada (WebKit explícito como `NOT_EXECUTED`);
- UAT 100% crítico / ≥98% total sem Sev1.
