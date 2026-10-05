# 58 — Roadmap de remediação da auditoria do repositório

**Revisão:** 2026-10-01 · **Estado do plano:** planejamento concluído; execução local em andamento.
**Auditoria de origem:** [auditoria estática](audits/repository-audit-2026-10-01.md).
**Backlog desta remediação:** [59](59_backlog_repository_remediation_2026-10-01.md).
**Backlog State of Art relacionado:** [SOA-01–40](57_backlog_state_of_art.md).

**Checkpoint corrente (2026-10-02):** ver [docs/57](57_backlog_state_of_art.md), [docs/59](59_backlog_repository_remediation_2026-10-01.md) e [runtime state](99_runtime_state.md). O plano continua sujeito aos gates humanos e não representa certificação ou promoção de evidência.

## Objetivo e limites

Tratar os nove achados da auditoria estática e encaminhar todas as dimensões
com nota baixa para os itens executáveis existentes. Este roadmap complementa
o programa State of Art e o BUILD canônico; não substitui os documentos
0300–0302 nem reabre, duplica ou fecha tasks SOA por declaração.

A auditoria não executou testes nem observou runtime. As notas são consultivas,
não metas de implementação. As condições de aceite abaixo exigem evidência
nova; os resultados de 2026-09-17 continuam históricos. Nenhuma fase autoriza
deploy, publicação clínica, produção, participante real, dispatch remoto ou
uso de serviço externo.

## Sequência por fases e sprints

| Fase | Sprint e itens | Saída verificável | Gate de saída |
| --- | --- | --- | --- |
| R0 — Planejamento e continuidade | Plano atual, backlog 59, atualização dos checkpoints e manifesto | Cada achado tem destino, dependência e critério de pronto; decisões humanas continuam explícitas | G-R0: documentação ligada, sem alteração de código nem promoção de evidência |
| R1 — Integridade dos verificadores | S1.1: REM-01, REM-03, REM-04 | Workflow candidate consome o contrato bounded; contenção e digest são corretos para todos os arquivos | G-R1: casos negativos e positivos demonstram falha fechada; nenhum resumo histórico é promovido |
| R2 — Denominadores e seleção E2E | S1.2: REM-02, REM-05; SOA-29–32 | Produção TS/TSX está no denominador definido e o projeto real é selecionável somente no modo apropriado | G-R2: arquivos não importados entram no cálculo; ausência de runtime nunca resulta em PASS real |
| R3 — Jornada educacional | S2.1: REM-06; SOA-14–17 e SOA-25 conforme dependências | Modalidade e versão percorrem o fluxo aprovado; regras somativas são aplicadas no boundary correto | G-R3: modalidade formativa preservada; avaliação somativa exercitada conforme PRD/SPEC |
| R4 — Governança e evidência | S2.2: REM-07A, REM-07B, REM-08; SOA-01/02/06/07/20/39 | Decisões ficam registradas; checkpoints, scorecards e proveniência distinguem histórico de candidato atual | G-R4: nenhuma regra editorial ou meta operacional foi presumida; evidência atual tem origem/hash explícitos |
| R5 — Segurança, experiência e operação | S3.1: REM-09; SOA-13/18/19/22–28/34–37 | Restore compatível definido; gaps de RLS, acessibilidade, UX, integração e operação recebem evidência própria | G-R5: provas live somente em ambiente descartável autorizado; limites e skips continuam visíveis |
| R6 — Fechamento de remediação | S4.1: REM-10; SOA-38–40 | Revisão do candidato final, rastreabilidade e relatório atualizado com gaps residuais | G-R6: nenhum P0/P1 aberto no recorte promovido; mesma revisão/hash e aprovações exigidas estão presentes |

Os itens R1 e R2 podem avançar em paralelo quando não disputarem o mesmo
arquivo ou recurso. O trabalho de domínio não depende da decisão editorial
quando permanecer no fluxo formativo. Em 2026-10-01, Ricardo autorizou
autorrevisão no MVP e manteve RPO ≤1h/RTO ≤4h; H-LIVE autoriza Docker local
efêmero com dados sintéticos. AAA-001, H-REMOTE e H-CONTENT continuam gates
separados para aceite de produção, CI remoto e publicação. Capacidade e
duração serão estimadas pelo responsável ao iniciar cada sprint; este plano
não promete calendário.

## Mapa completo das 28 dimensões auditadas

As notas preservam o retrato consultivo de 2026-10-01. A coluna final aponta
o local em que o problema ou a falta de evidência será tratado.

| Dimensão | Nota | Destino de remediação |
| --- | ---: | --- |
| Gates Discovery, PRD e SPEC | 86 | SOA-01; preservar gates aprovados e registrar conflitos em REM-07A/07B |
| Planejamento BUILD e rastreabilidade | 72 | SOA-02 e este adendo no backlog mestre |
| Estado, log e backlog atuais | 48 | SOA-06 e REM-08 |
| Auditorias, scorecards e proveniência | 55 | SOA-07, REM-08 e REM-10 |
| Arquitetura e fronteiras de módulos | 84 | SOA-08; regressão preservada durante as fases |
| Domínio e regras locais | 74 | SOA-14–17; REM-06 para modalidade somativa |
| API, contratos e validação | 84 | SOA-09; contratos e testes entram na revisão final |
| Identidade, autorização e fronteiras públicas | 80 | SOA-10/11 e SOA-34 |
| Persistência, transações e migrations | 80 | SOA-12; REM-09 para compatibilidade do restore |
| RLS e isolamento em banco real | 60 | SOA-13, condicionado a H-LIVE |
| Tentativa, resposta, correção e jornada | 70 | SOA-14/16/17 e SOA-32 |
| Avaliação somativa e elegibilidade | 45 | REM-06 e SOA-15 |
| Currículo e conteúdo clínico | 42 | SOA-18/19; publicação permanece sob H-CONTENT |
| Autoria, revisão e publicação | 58 | REM-07A e SOA-20 |
| Web, interação e UX | 68 | SOA-22 |
| Manutenibilidade frontend e componentes | 42 | SOA-23 |
| Acessibilidade | 55 | SOA-24 |
| Worker e processamento assíncrono | 74 | SOA-25 |
| Qdrant e IA assistiva | 64 | SOA-26/27; fornecedor real exige autorização própria |
| Instrumentação, métricas e SLOs | 72 | SOA-35/36; metas operacionais ficam em REM-07B |
| Desenho da suíte unitária/contratos/integração | 78 | SOA-29/32 |
| Cobertura, skips e seleção de E2E | 48 | REM-02/05 e SOA-30/32 |
| Assurance de mutação | 45 | REM-01/03/04 e SOA-31 |
| CI e supply chain | 78 | REM-01 e SOA-34/38 |
| Proveniência de release e same-SHA | 35 | SOA-39/40; execução remota depende de H-REMOTE |
| Runbooks, DR e operação | 60 | REM-09 e SOA-35/37 |
| Manutenibilidade geral | 60 | SOA-23/33 |
| Prontidão para piloto, produção e publicação | 25 | SOA-40, AAA-001 e decisões humanas aplicáveis |

Uma nota superior a 70 não substitui prova atual: todas as dimensões técnicas
continuam sujeitas à regressão e à revisão de evidência no candidato final.

## Critérios de saída globais

1. Os nove IDs AUDIT-20261001-01–09 têm evidência individual e status atualizado.
2. Os dois P1 confirmados ficam corrigidos e reproduzidos por verificações
   focais antes de qualquer declaração de certificação.
3. A suíte de cobertura considera o código de produção definido pela SOA-QB-v1,
   inclusive TSX e arquivos sem import de teste; exclusões têm justificativa.
4. A modalidade somativa segue o contrato aprovado, sem aplicar elegibilidade
   somativa ao quiz formativo.
5. H-EDITORIAL e H-OPS seguem as decisões expressas em 2026-10-01; AAA-001,
   H-REMOTE e H-CONTENT continuam sem decisão. H-LIVE autoriza apenas os
   ambientes locais sintéticos descritos pelo usuário.
6. Restore, RLS e E2E real têm evidência de ambiente descartável somente após
   autorização correspondente; evidência sintética ou histórica permanece
   identificada como tal.
7. Revisão final usa candidato estável e proveniência compatível. Se não houver
   autorização para remoto, a conclusão permanece local e limitada.
