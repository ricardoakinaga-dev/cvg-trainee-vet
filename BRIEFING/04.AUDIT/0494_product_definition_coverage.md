# 0494 — Matriz de coerência Discovery → PRD → SPEC

**Item avaliado:** 2 — Discovery, PRD e SPEC como definição do produto  
**Baseline:** 86/100 no `0491_full_construction_audit.md`  
**Objetivo:** tornar explícita e verificável a cadeia de definição, sem alterar silenciosamente o escopo aprovado e sem confundir produto definido com produto já implementado.

## 1. Gate formal e ordem

| Gate | Documento | Estado vigente | Evidência de ordem |
|---|---|---|---|
| Discovery | `00.DISCOVERY/0090_discovery_validation.md` | **APROVADO** em 2026-08-07 | `ORDEM CUMPRIDA: DISCOVERY APROVADO ANTES DO PRD` |
| PRD | `01.PRD/0090_prd_validation.md` | **APROVADO** em 2026-08-07 | gate registra aprovação depois do Discovery e D-102 a D-108 |
| SPEC | `02.SPEC/0190_spec_validation.md` | **SPEC_APROVADA_TECNICAMENTE** em 2026-08-09 | PRD formalmente aprovado; 0101–0118 e links verificados |
| BUILD documental | `03.BUILD/0391_documentation_gate.md` | **FECHADO** | documentos 04–08 presentes; implementação autorizada após o gate |

O gate executável `pnpm verify:product-definition` verifica os marcadores acima. A aprovação formal não é inferida pela existência de uma pasta nem pela existência de código.

## 2. Matriz de cobertura da definição

| ID | Definição que deve permanecer estável | Discovery | PRD | SPEC/destino técnico | Estado da definição | Estado atual da construção | Evidência |
|---|---|---|---|---|---|---|---|
| DEF-01 | Problema, contexto, hipótese de valor e benefício | 0002–0005, 0009 | 0020 §§1–2, 0015 | 0100, 0120 | `DEFINED` + `MAPPED` | Fundação parcial; não altera o problema | 0090, 0020, 0190 |
| DEF-02 | Usuários, stakeholders, papéis e finalidade de acesso | 0006, D-079 | 0020 §3, 0012 RN-001–009 | 0102, 0111, 0114 | `DEFINED` + `MAPPED` | Convite/sessão mínimos; superfícies de papel incompletas | 0090, 0020, 0111 |
| DEF-03 | Escopo IN/OUT/FUTURE, limites clínicos e fronteira autoral | 0004, 0009 | 0011, 0020 §§5/11 | 0101, 0111–0114 | `DEFINED` + `MAPPED` | Limites preservados; conteúdo publicado não criado | 0011, 0012, 0120 |
| DEF-04 | Jornada do participante e progressão | 0003–0005 | 0010, 0012, 0013, 0017 | 0104–0108, 0114–0115 | `DEFINED` + `MAPPED` | Só a fatia convite → atividade → tentativa está funcional | 0010, 0013, 0105, 0491 |
| DEF-05 | Conteúdo autoral, aprovação clínica, validade e privacidade | 0007, D-075/D-109 | 0012 RN-040–049, RF-031–039 | 0111–0114 | `DEFINED` + `MAPPED` | Projeções/redaction mínimos; autoria completa ausente | 0012, 0013, 0111, 0417 |
| DEF-06 | Avaliação, limiares, tentativas, remediação e retenção | 0003, anexo 0003 | 0012 RN-020–035, RF-040–059 | 0104–0108, 0118 | `DEFINED` + `MAPPED` | Estados/tentativa mínimos; cálculo completo ainda não implementado | 0012, 0013, 0118, 0491 |
| DEF-07 | Contestação, correção versionada e recálculo | 0007 | 0012 RN-052–053, RF-060–065 | 0104–0111 | `DEFINED` + `MAPPED` | Correção humana/feedback parciais; contestação completa ausente | 0012, 0013, 0111, 0420 |
| DEF-08 | KPIs, painéis, auditoria, SLO e operação | 0005, anexo 0003 | 0015, RF-070–082, 0014 | 0111, 0113–0114, 0118 | `DEFINED` + `MAPPED` | Logs/health mínimos; dashboards/collector/restore ausentes | 0014, 0015, 0113, 0491 |
| DEF-09 | Decisões humanas, itens provisórios e escopo futuro | D-068, D-076–D-109 | 0012, 0016–0017, 0020 §13 | 0100, 0111–0117 | `DEFINED` + `DEFERRED` + `HUMAN_APPROVAL` | B-07/T2/conteúdo aguardam os gates próprios; não bloqueiam SPEC | 0090, 0090 PRD, 0190, backlog |
| DEF-10 | Cadeia de gate, estado real e não confundir definição com implementação | 0090 Discovery | 0090 PRD, 0020 | 0190, 0300–0302, 0491–0493 | `DEFINED` + `MAPPED` + `PARTIAL` | Estado atual explicitamente parcial e com bloqueios | 0491, 0492, 0493, traceability |

## 3. Invariantes de coerência

1. Discovery aprovado é pré-condição do PRD; o PRD não pode redefinir o problema sem novo gate.
2. PRD aprovado é pré-condição da SPEC; a SPEC detalha arquitetura/contratos sem inventar novo produto.
3. `IN`, `OUT` e `FUTURE` permanecem separados. O fato de uma capacidade estar no PRD e ainda ausente do código é `PARTIAL`, não motivo para removê-la silenciosamente do produto.
4. `PROPOSTA` de métrica, B-07, T2, calibração e protocolo clínico permanecem explicitamente classificados; não são convertidos em `APROVADO` por inferência.
5. A implementação parcial registrada no 0491 não rebaixa o status formal dos gates nem autoriza declarar o produto pronto.
6. O código não é a fonte primária da definição; PRD/SPEC são a fonte do produto e `traceability.yml` liga a decisão à execução.
7. Nenhum resultado digital altera competência prática, autonomia clínica, autorização de procedimento ou escopo futuro bloqueado.

## 4. Pontos que estavam implícitos e agora estão explícitos

- A diferença entre **definição completa** e **construção parcial** agora aparece em cada linha da matriz.
- Requisitos ausentes da construção não são classificados como “fora do produto”; continuam `MAPPED` e seguem para os itens técnicos posteriores do roadmap 0492.
- B-07 é `HUMAN_APPROVAL`/pré-piloto; não é lacuna de Discovery, PRD ou SPEC.
- Métricas com baseline pendente são `PROPOSTA`; não bloqueiam a coerência da definição, mas não podem ser apresentadas como resultado medido.
- O item 2 pode ser avaliado isoladamente sem promover as notas de API, currículo, segurança, web ou build.

## 5. Gate de saída do item 2

O item 2 só será reavaliado em pelo menos 95/100 após:

- `pnpm vitest run tests/integration/product-definition-governance.test.ts` passar;
- `pnpm verify:product-definition` passar;
- os dez domínios `DEF-01`–`DEF-10` permanecerem cobertos e classificados;
- Discovery, PRD e SPEC continuarem aprovados na ordem correta;
- `traceability.yml` ligar esta matriz a requisitos, documentos, testes e comando de verificação;
- roadmap, backlog, runtime state e log registrarem a decisão;
- nenhum escopo tenha sido reduzido apenas para elevar a nota.

## 6. Não aprovação de release

Esta matriz melhora a qualidade da definição; não afirma que o sistema implementa todos os RFs. Os bloqueios técnicos do 0491 (`AUD-C0-001`, RLS contextual, E2E real, operação/restore e conteúdo clínico) continuam válidos e pertencem aos itens correspondentes do roadmap.

