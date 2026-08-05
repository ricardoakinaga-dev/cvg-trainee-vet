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
- [ ] Dor operacional validada com usuários (B-01);

### USUÁRIOS

- [x] Usuário primário definido (colaborador);
- [x] Usuários secundários e operadores mapeados;
- [x] Responsabilidades claras (matriz de acesso 0006 e matriz de responsabilidades em 0012 §8);
- [ ] Nomes nomeados — PO, coordenação educacional, comitê científico, LGPD/segurança (B-03);
- [ ] Quantidade e perfil da coorte — parâmetros confirmados pelo patrocinador como insumos (10–15, 3 turnos); inventário e revalidação formal pendentes (B-02).

### FLUXOS

- [x] Fluxo principal definido (jornada do colaborador, 0020 §4);
- [ ] Exceções completamente definidas — há políticas pendentes de afastamento, acessibilidade e reprovação recorrente;
- [ ] Fluxo atual real validado (B-01, compromisso — roteiro no anexo 0007).

### ESCOPO

- [x] IN SCOPE claro (0011 §2);
- [x] OUT OF SCOPE definido (0011 §3);
- [x] FUTURE SCOPE registrado (0011 §4);
- [x] Modalidade digital e fronteira das simulações confirmadas pelo patrocinador como insumos (D-068); prática presencial bloqueada pelo `GATE-EXP-PRAT-01`;
- [ ] Áreas clínicas do piloto confirmadas pelo patrocinador como insumo — núcleo + Emergência + Internação; revalidação formal pendente após B-03 (B-06);
- [ ] Coorte piloto delimitada (B-02 — inventário).

### REGRAS

- [ ] Regras principais completamente definidas — RN-015, RN-023, RN-074, RN-075 e nomeações permanecem pendentes;
- [x] Restrições claras (segurança clínica, fontes, LGPD, não punição);
- [x] Propostas do gate confirmadas pelo patrocinador em 2026-08-05 (incluindo D-068: RN-018, RN-081 a RN-085 e RF-027/RF-052 a RF-055 — ver anexo 0008).

### REQUISITOS

- [ ] Requisitos funcionais completos para o MVP proposto — existem requisitos e decisões pendentes (0013 §10);
- [ ] Requisitos não funcionais completamente definidos — acessibilidade, política formal de dados e exceções ainda possuem pendências;
- [ ] Pendências registradas: blueprint/itens do diagnóstico, avaliadores de resposta construída, equivalência, acessibilidade (0013 §10).

### MÉTRICAS

- [x] KPIs definidos (0015 §2 e §3);
- [x] Critérios de sucesso claros (0015 §4);
- [x] Regras de uso das métricas (0015 §6);
- [ ] Metas definitivas calibradas com baseline (B-07).

### RISCOS

- [x] Riscos listados (0007);
- [x] Hipóteses registradas (0007, H-01 a H-10);
- [ ] Owners e prazos de mitigação aprovados (B-03).

---

## Condições bloqueantes do gate

| ID | Condição | Impacto | Owner recomendado | Status |
|---|---|---|---|---|
| B-01 | fluxo atual não validado com usuários | reduz confiança do desenho | PO + coord. clínica | PENDENTE — roteiro pronto (anexo 0007) |
| B-02 | coorte e público não dimensionados | piloto não delimitável | gestão | PARCIAL — parâmetros confirmados pelo patrocinador como insumos; inventário e revalidação formal pendentes |
| B-03 | responsáveis não nomeados | governança incompleta | direção | PENDENTE — definir na reunião de gate |
| B-04 | licença das obras não verificada | bloqueia produção de conteúdo | jurídico/gestão | PARCIAL — RN-046 confirmada pelo patrocinador como insumo, sem autorizar produção ou publicação de conteúdo; verificação jurídica pendente |
| B-05 | política de dados sem validação do responsável LGPD | risco LGPD | responsável LGPD | PARCIAL — regras preliminares confirmadas pelo patrocinador; validação formal pendente |
| B-06 | áreas do piloto | escopo clínico | coordenação clínica | CONFIRMADO PELO PATROCINADOR COMO INSUMO — núcleo + Emergência + Internação; revalidação formal pendente após B-03 |
| B-07 | baseline ausente | metas não calibradas | coord. educacional | PENDENTE — aplicar diagnóstico na coorte |

## Decisões humanas preservadas como insumos (confirmadas em 2026-08-05 — ver anexo 0008)

As decisões abaixo reduzem pendências de produto, mas não aprovam o gate enquanto qualquer item obrigatório permanecer incompleto.

1. Limiar geral 70% e críticos 80% (D-040/D-041) — ✅
2. Composição quiz 0% + caso 30% + prova 70% (D-044) — ✅ corrige inconsistência RN-020/RN-022
3. Tentativas 2 + remediação, intervalo mínimo 7 dias (D-042/D-043) — ✅
4. Núcleo + Emergência/Internação no piloto (D-020) — ✅
5. Piloto 12 semanas, coorte 10–15, 3 h/mês (D-061/D-060/D-016) — ✅
6. Certificação: status de conclusão no piloto (D-049) — ✅
7. Reprovação recorrente: plano individual com mentor, sem punição (D-047) — ✅
8. Política de dados: regras preliminares de acesso/retenção confirmadas pelo patrocinador, mas inaplicáveis até validação formal LGPD (B-05) — ⚠️
9. Contestação em 7 dias úteis (D-046) — ✅
10. Dispensa por domínio: não no piloto (D-045) — ✅
11. Modalidade: primeira versão integralmente digital, com casos e simulações digitais; sem prática presencial associada à plataforma; expansão prática bloqueada pelo `GATE-EXP-PRAT-01` (D-068) — ✅

---

## Decisão

```text
STATUS: REPROVADO — EM CORREÇÃO (RECLASSIFICAÇÃO CANÔNICA, 2026-08-05)
AÇÃO NECESSÁRIA: REEXECUTAR E APROVAR DISCOVERY; FECHAR B-01, B-02, B-03, B-04, B-05 E B-07; CONCLUIR REQUISITOS PENDENTES; REEXECUTAR ESTE GATE
SPEC: PROIBIDA, INCLUSIVE PREPARAÇÃO FORMAL
BUILD: PROIBIDO
```

### Ações permitidas enquanto o gate estiver reprovado

- Corrigir documentos e sincronizar decisões já confirmadas;
- Antes de B-05: desenhar instrumentos, fazer levantamentos estritamente agregados/anônimos, nomear responsáveis e concluir verificação jurídica;
- Depois de B-05: executar entrevistas/inventários identificáveis e coletar a baseline B-07 conforme a política validada;
- Resolver regras, requisitos, exceções e critérios marcados como pendentes;
- Preparar evidências e checkpoint Git para nova submissão dos gates.

### Ações proibidas

- Iniciar SPEC ou sua preparação formal;
- Criar backlog de BUILD, arquitetura, banco, API, telas ou código;
- Produzir qualquer conteúdo clínico enquanto B-04 e os gates permanecerem abertos;
- Coletar ou acessar, antes de B-05, dados pessoais, gravações, diagnóstico individual, prontuários, casos reais ou indicadores vinculáveis;
- Tratar qualquer decisão individual do patrocinador como aprovação automática de fase.

## Aprovação humana

| Papel | Nome | Decisão | Data |
|---|---|---|---|
| Patrocinador executivo | MV. Ricardo Akinaga — CEO | RECLASSIFICAÇÃO CANÔNICA APROVADA; DECISÕES DE PRODUTO PRESERVADAS COMO INSUMOS | 2026-08-05 |
| Product owner | PENDENTE (B-03) | PENDENTE | PENDENTE |
| Coordenação clínica/RT | PENDENTE (B-03) | PENDENTE | PENDENTE |
| Coordenação educacional | PENDENTE (B-03) | PENDENTE | PENDENTE |
| LGPD/segurança | PENDENTE (B-03) | PENDENTE | PENDENTE |

## Próximo passo após fechamento dos compromissos

```text
B-01 A B-07 FECHADOS + REQUISITOS PENDENTES RESOLVIDOS
→ REEXECUTAR 0090_DISCOVERY_VALIDATION
→ REEXECUTAR 0090_PRD_VALIDATION
→ SOMENTE COM AMBOS APROVADOS: SPEC ENGINE (02.ESPEC)
→ 0100_spec_readiness_review.md
→ FASE POR FASE ATÉ 0190_spec_validation.md
```
