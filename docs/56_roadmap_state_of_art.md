# 56 — Roadmap State of Art por gates

**Revisão-base:** 2026-09-17 (09:30) · **Estado nessa revisão:** IN_PROGRESS — sprint 1 consolidada (SOA-31/33/36 + regressão completa); seleção F1→F3 pelo Lead; nenhuma certificação.
**Contrato:** [plano e SOA-QB-v1](55_executive_plan_state_of_art.md). **Tasks:** [SOA-01–40](57_backlog_state_of_art.md).

**Checkpoint corrente (2026-10-02):** o programa continua IN_PROGRESS; status de execução, decisões e próximos passos estão no topo de [docs/57](57_backlog_state_of_art.md) e [docs/59](59_backlog_repository_remediation_2026-10-01.md). A revisão-base deste roadmap não substitui esses checkpoints.

## Adendo — 2026-10-01

A auditoria estática de 2026-10-01 adiciona uma trilha focada de remediação:
[roadmap 58](58_roadmap_repository_remediation_2026-10-01.md) e
[backlog 59](59_backlog_repository_remediation_2026-10-01.md). Ela detalha os
achados AUDIT-20261001-01–09 e mapeia as notas das 28 dimensões para as tasks
SOA existentes. O checkpoint prevalente fica em
[docs/57](57_backlog_state_of_art.md); esta revisão de 17/09 permanece como
snapshot histórico e não certifica o estado atual.

### Decisões e execução — 2026-10-01

Ricardo decidiu manter a autorrevisão no MVP conforme RN-044/RF-034. O contrato
foi detalhado no adendo SPEC 0191 e o teste RED/GREEN da aplicação começou;
publicação clínica continua sujeita ao gate H-CONTENT. O alvo aprovado permanece
RPO ≤1h/RTO ≤4h (RNF-015/D-107). H-LIVE autoriza PostgreSQL 16/Qdrant locais,
efêmeros e sintéticos; AAA-001 ainda rege aceite operacional/produção. H-REMOTE
segue pendente.

## Sequência executiva

Cada item pertence a uma fase primária; validações transversais retornam depois sem duplicar IDs. Sprints são pacotes ordenados de inspeção/RED/execução, não promessa de prazo. Uma task pode preparar pré-condições antes de seu aceite final. O Lead detalha esforço/capacidade após confirmar contratos; nenhuma sprint está iniciada por este documento.

| Fase | Sprints e itens | Saída observável | Gate de saída |
| --- | --- | --- | --- |
| F1 — Contratos/baseline | S1.1: SOA-01,02,06; S1.2: SOA-03,04,05,07 | Contradições triadas; inventário atual; históricos separados; autoridades explícitas | G-SOA-1: baseline hashado, barra congelada, contratos claros no recorte; H-EDITORIAL segregada |
| F2 — Integridade da medição | S2.1: SOA-29,33; S2.2: SOA-30,31; S2.3: SOA-32 | Node22, denominadores/skips, harness demonstrado, E2E real selecionável | G-SOA-2: negativos dos medidores passam; mutação não aceita antes da validade; ausência de DB nunca produz PASS live |
| F3 — Vertical educacional | S3.1: SOA-08,09,10,11,12,13; S3.2: SOA-14,15,25; S3.3: SOA-16,17,21 | Tentativa/correção/avaliação/progressão/remediação/retenção ligadas | G-SOA-3: jornada browser→API→DB descartável/RLS, replay/concorrência; nenhum P0/P1 |
| F4 — Conteúdo/editorial | S4.1: SOA-20; S4.2: SOA-18,19 | Inventário vs placeholders; versões/revisão; B-07 em lane própria | G-SOA-4: aceite técnico e aprovação humana por versão para publicação; rascunho não vira biblioteca completa |
| F5 — Frontend | S5.1: SOA-23; S5.2: SOA-22,24 | Componentes reais, superfícies por papel, retomada, acessibilidade | G-SOA-5: cinco superfícies + teclado/leitor/zoom e E2E real, sem exposição interna |
| F6 — Operações live | S6.1: SOA-28,35,36; S6.2: SOA-26,27,37 | Limites distribuídos, sinais/SLOs, índice reconstruível, IA desligável, recuperação | G-SOA-6: ambiente descartável autorizado, sinais e runbooks reconciliados; provider real pendente explicitado |
| F7 — Certificação | S7.1: SOA-34,38,39; S7.2: SOA-40 | Evidência congelada, revisão independente, matriz de prontidão | G-SOA-7: barra e gates aplicáveis no mesmo candidato; remoto/promoção com autorização separada |

## Dependências sem bloqueios artificiais

- Caminho técnico: F1 recorte estável → F2 medição confiável → F3 vertical → F5 experiência integrada → F6 prova operacional → F7 parecer. F4 fornece versões aprovadas quando a prova/publicação exige; fixtures sintéticas isoladas viabilizam F3 antes da biblioteca completa.
- SOA-32 tem dois marcos: preparar/validar seleção do harness em F2 e executar jornada completa depois de F3. G-SOA-2 não significa G-SOA-3 nem encerramento antecipado de SOA-32.
- SOA-05 reconcilia documentação em F1; prova de restore vem de SOA-37. SOA-07 organiza históricos em F1; novo parecer vem de F7. Nenhum marco transforma evidência antiga em atual.
- SOA-31 valida primeiro o medidor; ≥95% é exigido na certificação com escopo crítico congelado. Expansão em F3–F6 exige remedir.
- SOA-18/B-07 e SOA-19 podem produzir rascunhos em paralelo lógico ao núcleo, sem publicação. Calibração, fornecedor, T2 e biblioteca de 24 módulos não são dependências universais de F2/F3. RN-074 e PRD 0090 prevalecem sobre bloqueios históricos amplos.
- H-EDITORIAL foi resolvido por Ricardo em 2026-10-01: autorrevisão no MVP é permitida somente pela identidade clínica aprovada e configurada no servidor; publicação continua em gate separado. Revisão independente de engenharia continua distinta da autoria clínica.
- SOA-26/27 não bloqueiam jornada: demonstrar Qdrant/IA desligados. Provider pago/externo continua pendente sem autorização; não inventar prova nem substituir fornecedor silenciosamente.
- SOA-34 e revisão negativa de segurança acompanham todas as fases; renovação no candidato final pertence a F7. F7 não é a primeira oportunidade de descobrir regressão.

## Procedimento por sprint

1. Lead lê runtime/log/backlog, confirma ambiente e propriedade dos arquivos; vincula requisito/SPEC. Contrato ausente ou conflitante vira investigação/decisão, não código especulativo.
2. Captura baseline e RED: esperado, fixture sintética, comando, versão, falha observada. Para docs, RED é contradição/link quebrado ou verificador negativo; não fabricar teste de aplicação.
3. Implementa fatia mínima reversível; GREEN, regressão e REFACTOR. Serializa migrations compatíveis; ensaia somente no DB descartável autorizado.
4. Executa checks aplicáveis, registra limites/skips; não reduz gates. Falha retorna à task com evidência.
5. Quiesce escritores, aguarda checks, captura sentinel, obtém review independente, captura novo sentinel — nessa ordem, nunca paralelo com testes/typecheck. Drift exige causa isolada, novo freeze/review.
6. Audita sprint, registra entregas/gaps/riscos/ajustes/próxima fase e atualiza runtime/log/backlog/traceability pelo Lead. Só então fecha o gate.

## Stop, retomada e rollback

P0/P1 confirmado, perda de integridade, dado proibido, medidor inválido ou contrato em conflito interrompe a fatia afetada; nenhum PASS por retry oportunista. Preservar falha, seed e logs redigidos. Retomar por revert da fatia, feature desligada ou correção forward; não apagar história nem resetar DB real. Conteúdo usa retirada versionada; Qdrant reconstrói de PostgreSQL. Alterar fonte/config/teste exige refazer evidência afetada e revisão, mantendo a barra v1.

Dependência humana/externa mantém WAITING_HUMAN_APPROVAL ou BLOCKED com causa, impacto, ação e owner. Trabalho local independente continua. Sem remoto, entregar prontidão local limitada e lista de faltantes — nunca produção certificada. Deploy, push, dispatch/tag, gasto e instalações não estão autorizados.
