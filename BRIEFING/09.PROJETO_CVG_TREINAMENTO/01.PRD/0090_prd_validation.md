# 0090 — PRD Validation (Gate)

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Data:** 2026-08-05  
**Resultado:** `REPROVADO — EM CORREÇÃO; SPEC E BUILD BLOQUEADOS`
**Natureza dos artefatos:** rascunho controlado; decisões do patrocinador são insumos preservados, não aprovação do gate

---

## Checklist obrigatório

### PROBLEMA

- [x] Problema claramente definido (0009 Discovery Master §2);
- [x] Impacto mensurável (dimensões em 0004 e anexo 0003);
- [x] Dor operacional e processo atual confirmados por MV. Ricardo Akinaga, responsável por todas as áreas do MVP (D-078/B-01);

### USUÁRIOS

- [x] Usuário primário definido (colaborador);
- [x] Usuários secundários e operadores mapeados;
- [x] Responsabilidades claras (matriz de acesso 0006 e matriz de responsabilidades em 0012 §8);
- [x] Responsável do MVP nomeado — MV. Ricardo Akinaga acumula as funções por D-076; B-03 fechado;
- [x] Público/coorte confirmado por D-079: aproximadamente 10 veterinários; todos participam; sem inventário nominal ou segmentação obrigatória (B-02 fechado).

### FLUXOS

- [x] Fluxo principal definido (jornada do colaborador, 0020 §4);
- [x] Jornada prática e fluida confirmada por D-080: uma próxima ação clara, unidades breves dentro de módulos completos, feedback imediato e progresso visível;
- [ ] Exceções completamente definidas — afastamento e acessibilidade permanecem pendentes;
- [x] Fluxo atual real validado por D-078: aprendizado informal, sem trilha, avaliação ou registro centralizado.

### ESCOPO

- [x] IN SCOPE claro (0011 §2);
- [x] OUT OF SCOPE definido (0011 §3);
- [x] FUTURE SCOPE registrado (0011 §4);
- [x] Modalidade digital e fronteira das simulações confirmadas pelo patrocinador como insumos (D-068); prática presencial bloqueada pelo `GATE-EXP-PRAT-01`;
- [x] Áreas clínicas do piloto confirmadas pelo responsável do MVP — núcleo + Emergência + Internação (B-06);
- [x] Coorte inicial delimitada: aproximadamente 10 veterinários, abrangendo toda a equipe (D-079).
- [x] Programa curricular clínico V3 definido no PRD 0017: 24 meses, duas partes, 24 módulos e 96 sessões;
- [x] Carga/cadência de D-084/D-085 confirmada pelo patrocinador em 2026-08-06: 149 horas e correção aberta em até cinco dias úteis; a fatia vertical mede viabilidade operacional sem reabrir a aprovação curricular;
- [x] Ordem de validação: fatia vertical do Mês 2 antes da produção em escala; demais módulos em ondas após aprendizado.

### REGRAS

- [ ] Regras principais completamente definidas — RN-015, RN-023, RN-074 e pontos de conteúdo permanecem pendentes;
- [x] Restrições claras (segurança clínica, fontes, LGPD, não punição);
- [x] Propostas do gate confirmadas pelo patrocinador em 2026-08-05 (incluindo D-068: RN-018, RN-081 a RN-085 e RF-027/RF-052 a RF-055 — ver anexo 0008).

### REQUISITOS

- [ ] Requisitos funcionais completos para o MVP proposto — existem requisitos e decisões pendentes (0013 §10);
- [ ] Requisitos não funcionais completamente definidos — acessibilidade e exceções ainda possuem pendências; política mínima de dados aprovada por D-077;
- [ ] Pendências registradas: validação clínica do blueprint detalhado, equivalência e acessibilidade; correção de registro/passagem fechada por D-070 e erro crítico fechado por D-082.
- [x] Regra de avaliabilidade definida: pergunta/caso sem gabarito ou rubrica testados não pode ser publicado (RF-096/RN-088).

### MÉTRICAS

- [x] KPIs definidos (0015 §2 e §3);
- [x] Critérios de sucesso claros (0015 §4);
- [x] Regras de uso das métricas (0015 §6);
- [ ] Metas definitivas calibradas com baseline (B-07).

### RISCOS

- [x] Riscos listados (0007);
- [x] Hipóteses registradas (0007, H-01 a H-10);
- [x] Owner do MVP aprovado por D-076; prazos específicos continuam no plano de trabalho.

---

## Condições bloqueantes do gate

| ID | Condição | Impacto | Owner recomendado | Status |
|---|---|---|---|---|
| B-01 | fluxo atual do treinamento | estabelecer ponto de partida | MV. Ricardo Akinaga | FECHADO POR D-078 — aprendizado informal, sem trilha, avaliação ou registro centralizado |
| B-02 | público e coorte | dimensionar a primeira aplicação | MV. Ricardo Akinaga | FECHADO POR D-079 — aproximadamente 10 veterinários; todos participam |
| B-03 | responsável pelo MVP | responsabilidade concentrada e registrada | direção | FECHADO POR D-076/D-083 — MV. Ricardo Akinaga é o único aprovador clínico obrigatório |
| B-04 | uso das fontes no MVP interno | controles proporcionais | patrocinador | FECHADO POR D-075 — consulta manual, conteúdo original, PDFs fora da plataforma/Git e referência simples por módulo |
| B-05 | política mínima interna de dados | limitar coleta e acesso | MV. Ricardo Akinaga | FECHADO POR D-077 — somente nome/login profissional, progresso, tentativas, notas e logs mínimos; dados clínicos reais e de tutores proibidos |
| B-06 | áreas do piloto | escopo clínico | MV. Ricardo Akinaga | FECHADO COMO INSUMO — núcleo + Emergência + Internação |
| B-07 | baseline ausente | metas não calibradas | MV. Ricardo Akinaga | EM ELABORAÇÃO — blueprint de trabalho no Anexo 0012; falta revisão clínica, produção, teste e aplicação |

## Decisões humanas preservadas como insumos (confirmadas em 2026-08-05 — ver anexo 0008)

As decisões abaixo reduzem pendências de produto, mas não aprovam o gate enquanto qualquer item obrigatório permanecer incompleto.

1. Limiar geral 70% e críticos 80% (D-040/D-041) — ✅
2. Composição quiz 0% + caso 30% + prova 70% (D-044) — ✅ corrige inconsistência RN-020/RN-022
3. Tentativas 2 + remediação, intervalo mínimo 7 dias (D-042/D-043) — ✅
4. Núcleo + Emergência/Internação no piloto (D-020) — ✅
5. Aproximadamente 10 veterinários; trilha V3 de 24 meses, 24 módulos e 149 horas (D-084/D-085) — aprovada pelo patrocinador; a fatia vertical validará a viabilidade operacional;
6. Certificação: status de conclusão no piloto (D-049) — ✅
7. Reprovação recorrente: plano individual com mentor, sem punição (D-047) — ✅
8. Política de dados: D-077 aprovou o mínimo necessário e fechou B-05; prontuários, tutores, gravações e casos reais identificáveis permanecem proibidos — ✅
9. Contestação em 7 dias úteis (D-046) — ✅
10. Dispensa por domínio: não no piloto (D-045) — ✅
11. Modalidade: primeira versão integralmente digital, com casos e simulações digitais; sem prática presencial associada à plataforma; expansão prática bloqueada pelo `GATE-EXP-PRAT-01` (D-068) — ✅
12. Fontes: D-075 aprovou governança enxuta para o sistema interno; B-04 fechado; D-033 futura e não bloqueante — ✅
13. Programa curricular: matriz V3 definida no PRD 0017; D-084/D-085 substituem a cadência de D-081 — aprovada; confirmação operacional pela fatia vertical pendente;
14. Erro crítico: objetivo em reforço, explicação e novo caso equivalente; sem punição ou reprovação definitiva (D-082) — ✅

---

## Decisão

```text
STATUS: REPROVADO — EM CORREÇÃO (RECLASSIFICAÇÃO CANÔNICA, 2026-08-05)
AÇÃO NECESSÁRIA: REEXECUTAR E APROVAR DISCOVERY; FECHAR B-07; CONCLUIR REQUISITOS PENDENTES; REEXECUTAR ESTE GATE
SPEC: PROIBIDA, INCLUSIVE PREPARAÇÃO FORMAL
BUILD: PROIBIDO
```

### Ações permitidas enquanto o gate estiver reprovado

- Corrigir documentos e sincronizar decisões já confirmadas;
- Executar o diagnóstico B-07 somente com os dados permitidos pela política D-077;
- Usar o Anexo 0012 como rascunho de cobertura, sem tratá-lo como aprovação do blueprint ou da baseline;
- Resolver regras, requisitos, exceções e critérios marcados como pendentes;
- Preparar evidências e checkpoint Git para nova submissão dos gates.

MV. Ricardo Akinaga coordena e aprova essas atividades como responsável do MVP por D-076.

### Ações proibidas

- Iniciar SPEC ou sua preparação formal;
- Criar backlog de BUILD, arquitetura, banco, API, telas ou código;
- Publicar o programa ou iniciar BUILD enquanto os gates aplicáveis permanecerem abertos; rascunhos de conteúdo original são permitidos;
- Coletar dados além do escopo de D-077, especialmente gravações, prontuários, dados de tutores ou casos reais identificáveis;
- Tratar qualquer decisão individual do patrocinador como aprovação automática de fase.

## Aprovação humana

| Papel | Nome | Decisão | Data |
|---|---|---|---|
| Responsável pelo MVP interno | MV. Ricardo Akinaga | patrocinador, produto, coordenação clínica/educacional, operação, dados, segurança e aprovação dos gates documentais | 2026-08-05 |
| Aprovador de conteúdo clínico | MV. Ricardo Akinaga | aprovação humana obrigatória por módulo; revisão adicional opcional | 2026-08-06 |

O modelo enxuto e a regra de aprovação clínica única estão no documento Discovery 0006. D-083 substitui a exigência de segunda conferência de D-076.

## Próximo passo após fechamento dos compromissos

```text
B-01 A B-07 FECHADOS + REQUISITOS PENDENTES RESOLVIDOS
→ REEXECUTAR 0090_DISCOVERY_VALIDATION
→ REEXECUTAR 0090_PRD_VALIDATION
→ SOMENTE COM AMBOS APROVADOS: SPEC ENGINE (02.ESPEC)
→ 0100_spec_readiness_review.md
→ FASE POR FASE ATÉ 0190_spec_validation.md
```
