# 0090 — PRD Validation (Gate)

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Data:** 2026-08-05  
**Resultado:** `APROVADO COM CONDIÇÕES — AGUARDANDO FECHAMENTO DOS COMPROMISSOS`

---

## Checklist obrigatório

### PROBLEMA

- [x] Problema claramente definido (0009 Discovery Master §2);
- [x] Impacto mensurável (dimensões em 0004 e anexo 0003);
- [x] Dor operacional — condicionada: fluxo atual ainda não validado com usuários (B-01, compromisso do gate).

### USUÁRIOS

- [x] Usuário primário definido (colaborador);
- [x] Usuários secundários e operadores mapeados;
- [x] Responsabilidades claras (matriz de acesso 0006 e matriz de responsabilidades em 0012 §8);
- [ ] Nomes nomeados — PO, coordenação educacional, comitê científico, LGPD/segurança (B-03);
- [ ] Quantidade e perfil da coorte — parâmetros aprovados (10–15, 3 turnos); inventário pendente (B-02).

### FLUXOS

- [x] Fluxo principal definido (jornada do colaborador, 0020 §4);
- [x] Exceções mapeadas (interrupção, afastamento, anulação, retirada, reprovação recorrente, conflito de fontes);
- [ ] Fluxo atual real validado (B-01, compromisso — roteiro no anexo 0007).

### ESCOPO

- [x] IN SCOPE claro (0011 §2);
- [x] OUT OF SCOPE definido (0011 §3);
- [x] FUTURE SCOPE registrado (0011 §4);
- [x] Modalidade digital e fronteira das simulações aprovadas (D-068); prática presencial bloqueada pelo `GATE-EXP-PRAT-01`;
- [x] Áreas clínicas do piloto aprovadas — núcleo + Emergência + Internação (B-06 resolvido em 2026-08-05);
- [ ] Coorte piloto delimitada (B-02 — inventário).

### REGRAS

- [x] Regras principais definidas (0012, RN-001 a RN-085);
- [x] Restrições claras (segurança clínica, fontes, LGPD, não punição);
- [x] Propostas do gate confirmadas pelo patrocinador em 2026-08-05 (incluindo D-068: RN-018, RN-081 a RN-085 e RF-027/RF-052 a RF-055 — ver anexo 0008).

### REQUISITOS

- [x] Requisitos funcionais completos para o MVP proposto (0013, RF-001 a RF-094);
- [x] Requisitos não funcionais definidos (0014, RNF-001 a RNF-084);
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
| B-02 | coorte e público não dimensionados | piloto não delimitável | gestão | PARCIAL — parâmetros aprovados; inventário pendente |
| B-03 | responsáveis não nomeados | governança incompleta | direção | PENDENTE — definir na reunião de gate |
| B-04 | licença das obras não verificada | bloqueia produção de conteúdo | jurídico/gestão | PARCIAL — regra de uso aprovada (RN-046); verificação jurídica em andamento |
| B-05 | política de dados não aprovada | risco LGPD | responsável LGPD | APROVADA (RN-063 a RN-067) |
| B-06 | áreas do piloto não aprovadas | escopo aberto | coordenação clínica | APROVADO (núcleo + Emergência + Internação) |
| B-07 | baseline ausente | metas não calibradas | coord. educacional | PENDENTE — aplicar diagnóstico na coorte |

## Decisões humanas (confirmadas em 2026-08-05 — ver anexo 0008)

1. Limiar geral 70% e críticos 80% (D-040/D-041) — ✅
2. Composição quiz 0% + caso 30% + prova 70% (D-044) — ✅ corrige inconsistência RN-020/RN-022
3. Tentativas 2 + remediação, intervalo mínimo 7 dias (D-042/D-043) — ✅
4. Núcleo + Emergência/Internação no piloto (D-020) — ✅
5. Piloto 12 semanas, coorte 10–15, 3 h/mês (D-061/D-060/D-016) — ✅
6. Certificação: status de conclusão no piloto (D-049) — ✅
7. Reprovação recorrente: plano individual com mentor, sem punição (D-047) — ✅
8. Política de dados: acesso mínimo necessário, RH proibido, retenção vínculo + 2 anos (D-051/D-052/D-053) — ✅
9. Contestação em 7 dias úteis (D-046) — ✅
10. Dispensa por domínio: não no piloto (D-045) — ✅
11. Modalidade: primeira versão integralmente digital, com casos e simulações digitais; sem prática presencial associada à plataforma; expansão prática bloqueada pelo `GATE-EXP-PRAT-01` (D-068) — ✅

---

## Decisão

```text
STATUS: APROVADO COM CONDIÇÕES (2026-08-05)
AÇÃO NECESSÁRIA: FECHAR B-01, B-02 (INVENTÁRIO), B-03 (NOMEAÇÕES), B-04 (VERIFICAÇÃO JURÍDICA) E B-07 (BASELINE)
SPEC: LIBERADA PARA PREPARAÇÃO CONCEITUAL; EXECUÇÃO FORMAL APÓS FECHAMENTO DOS COMPROMISSOS
BUILD: PROIBIDO
```

## Aprovação humana

| Papel | Nome | Decisão | Data |
|---|---|---|---|
| Patrocinador executivo | MV. Ricardo Akinaga — CEO | APROVADO COM CONDIÇÕES | 2026-08-05 |
| Product owner | PENDENTE (B-03) | PENDENTE | PENDENTE |
| Coordenação clínica/RT | PENDENTE (B-03) | PENDENTE | PENDENTE |
| Coordenação educacional | PENDENTE (B-03) | PENDENTE | PENDENTE |
| LGPD/segurança | PENDENTE (B-03) | PENDENTE | PENDENTE |

## Próximo passo após fechamento dos compromissos

```text
B-01 A B-07 FECHADOS
→ SPEC ENGINE (02.ESPEC)
→ 0100_spec_readiness_review.md
→ FASE POR FASE ATÉ 0190_spec_validation.md
```
