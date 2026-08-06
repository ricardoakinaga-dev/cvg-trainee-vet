# Anexo 0009 — Validação da Documentação

**Projeto:** Sistema CVG de Treinamento Veterinário
**Data:** 2026-08-06
**Status:** `AUDITORIA TÉCNICA CONCLUÍDA — CHECKPOINT HUMANO PENDENTE`
**Escopo:** verificação documental da fase de briefing (Discovery + PRD) contra as diretrizes do `sistema_treinamento_veterinarios_cvg.md` e verificação física dos arquivos-fonte locais.

---

## 1. Escopo da validação

1. Leitura integral da documentação do briefing (`BRIEFING/09.PROJETO_CVG_TREINAMENTO/`): README, Discovery (0000 a 0090), PRD (0010 a 0090) e anexos (0001 a 0008);
2. Verificação das diretrizes institucionais (`sistema_treinamento_veterinarios_cvg.md`);
3. Verificação física dos três PDFs-fonte quanto a: número de páginas, estrutura (partes/seções/capítulos), título, autor, edição e ano;
4. Verificação de consistência interna: decisões de gate, regras de negócio (RN), decisões (D), bloqueios (B) e hierarquia de fontes.

Esta verificação preserva achados e correções da baseline. A reexecução de 2026-08-06 concluiu tecnicamente os gates pelas engines canônicas; a aprovação final continua dependendo da manifestação humana sobre o commit identificado.

## 2. Verificação física dos arquivos-fonte

| Item | Alegado na documentação | Verificado no arquivo | Resultado |
|---|---|---|---|
| Tratado — páginas | 7.047 | 7.047 | ✅ |
| Tratado — edição | 1ª, Roca, 2015, ISBN 978-85-277-2666-5 | 1ª, Roca, 2015, ISBN 978-85-277-2666-5 | ✅ |
| Tratado — estrutura | 2 volumes, 23 partes, 264 capítulos | Parte 1 a Parte 23 (Parte 23 = Apêndices); capítulos numerados até 264 | ✅ |
| Ettinger — páginas | 2.801 | 2.801 | ✅ |
| Ettinger — edição | 9ª, Elsevier, 2024 | 9ª edição, Elsevier | ✅ |
| Ettinger — estrutura | 2 volumes, 22 seções, 331 capítulos | Seções I a XXII; capítulos numerados até 331 | ✅ |
| Fossum — páginas | não constava | 5.008 | ⚠️ ausente — adicionado (F-03) |
| Fossum — edição | não constava | 4ª, Elsevier, 2014 (© 2015); ISBN 978-85-352-6991-8 | ⚠️ ausente — adicionado (F-03) |
| Fossum — estrutura | não constava | 4 partes (princípios cirúrgicos gerais; tecido mole; ortopedia; neurocirurgia); capítulos 1 a 44 | ⚠️ ausente — adicionado (F-03) |

## 3. Verificação de consistência interna

### 3.1 Decisões do gate PRD (2026-08-05)

| Decisão | Gate/anexo 0008 | Anexo 0005 (antes) | Anexo 0005 (após correção) |
|---|---|---|---|
| Limiar geral / crítico | 70% / 80% | "aguardando confirmação" | aprovada: 70% / 80% ✅ |
| Composição do escore | quiz 0% + caso 30% + prova 70% | "proposta 20/30/50 — aguardando confirmação" | aprovada: 0/30/70 (corrige 20/30/50) ✅ |
| Tentativas | 2 + remediação | "aguardando confirmação" | aprovada: 2 + remediação ✅ |
| Intervalo entre tentativas | mínimo 7 dias | "pendente" | aprovada: 7 dias ✅ |

**Conclusão:** o anexo 0005 estava desatualizado em relação ao gate de 2026-08-05; inconsistência corrigida neste relatório (D-040 a D-044).

### 3.2 Hierarquia de fontes

- Hierarquia original (anexo 0001): legislação > protocolo CVG > diretriz > Ettinger 2024 > Tratado 2015 — coerente com a diretriz institucional;
- **Gap:** o Fossum (obra cirúrgica, citada na sequência do programa) não constava como fonte canônica;
- **Correção aplicada:** Fossum incluído como F-03 na posição entre Ettinger e Tratado (específico para temas cirúrgicos e perioperatórios), com identificador próprio `FOS-2014-V{volume}-P{parte}-C{capitulo}`, mapeamento macro e regras de direitos autorais; README do projeto atualizado.

## 4. Consistência com as diretrizes institucionais

| Diretriz (`sistema_treinamento_veterinarios_cvg.md`) | Reflexo no briefing | Status |
|---|---|---|
| Treinamento por competências | 12 competências locais → núcleo comum e trilhas (anexo 0002) | ✅ |
| Avaliação diagnóstica antes do treinamento | RN-010 a RN-013 | ✅ |
| Aprendizagem espaçada | quatro sessões mensais, 6 h por módulo regular, 24 meses/149 h | ✅ aprovada em D-084/D-085; fatia vertical documental produzida, ensaio cronometrado pendente |
| Simulação/prática deliberada | simulação digital incluída para conhecimento/raciocínio; prática presencial excluída e bloqueada pelo `GATE-EXP-PRAT-01` | ✅ |
| Mentoria e feedback | papéis de mentor/preceptor; plano individual em reprovação recorrente | ✅ |
| Casos digitais estruturados | atividade digital de caso incluída; formato síncrono ou assíncrono ainda não decidido | ✅ com pendência de formato |
| Reuniões de melhoria sem culpabilização | referência organizacional externa à plataforma inicial; sujeita a LGPD | ✅ como referência externa |
| Avaliação por resultados (não só presença) | painel inicial restrito a KPIs educacionais digitais; comportamento e resultados assistenciais ficam externos | ✅ |
| 5 níveis de supervisão (CBVE) | referencial externo ao produto; não registrados nem avaliados na primeira versão | ✅ |

## 5. Resultado atualizado

```text
BASELINE DOCUMENTAL: AUDITADA E HARMONIZADA (2026-08-06)
VALIDAÇÃO TÉCNICA: CONCLUÍDA
ESTRUTURA DAS FONTES: VERIFICADA FISICAMENTE (TRATADO, ETTINGER, FOSSUM)
CONSISTÊNCIA INTERNA: PACOTE D-101 A D-108 HARMONIZADO
FONTE CIRÚRGICA: INCORPORADA (FOSSUM — F-03)
STATUS DOS GATES: APROVADOS TECNICAMENTE; APROVAÇÃO HUMANA DO COMMIT PENDENTE
CONFORMIDADE DO CRITÉRIO DE GATE COM AS ENGINES CANÔNICAS: ALINHADA
SITUAÇÃO DOS ITENS: B-01 (FECHADO POR D-078), B-02 (FECHADO POR D-079), B-03 (FECHADO PARA O MVP INTERNO POR D-076),
B-04 (FECHADO POR D-075), B-05 (FECHADO PARA O MVP INTERNO POR D-077), B-07 (BASELINE)
SPEC READINESS: AGUARDA CHECKPOINT HUMANO; BUILD NÃO INICIADO
```

## 6. Correções encontradas na baseline

1. `90.ANEXOS/0005_decisoes_pendentes.md` — D-040 a D-044 atualizados para refletir decisões confirmadas pelo patrocinador em 2026-08-05, preservadas como insumos para a reexecução do gate;
2. `90.ANEXOS/0001_governanca_fonte_conhecimento.md` — Fossum adicionado como F-03 (ficha, hierarquia, identificador, mapeamento macro, direitos autorais);
3. `README.md` — seção de fontes clínicas atualizada com o Fossum.

Essas alterações não equivalem a aprovação do conjunto documental. Sua consistência global será revisada item por item.

## 7. Itens pendentes e controles contínuos

- B-01: fechado por D-078 — aprendizado informal, sem trilha, avaliação ou registro centralizado;
- B-02: fechado por D-079 — aproximadamente 10 veterinários; todos participam, sem inventário ou segmentação obrigatória;
- B-03: fechado por D-076 e atualizado por D-083; Ricardo concentra as responsabilidades e é o único aprovador clínico obrigatório;
- B-04: fechado por D-075 para o MVP interno; manter consulta manual, conteúdo original, PDFs fora da plataforma/Git e referência simples por módulo; D-033 é futura e não bloqueante;
- B-05: fechado por D-077; aplicar o Anexo 0011 e não coletar prontuários, dados de tutores, gravações ou casos reais identificáveis;
- B-07: validar clinicamente, produzir, testar e aplicar o diagnóstico antes da baseline/piloto completo; não bloqueia a SPEC por D-101 proposta.

## 8. Controle de versão

O estado atual será preservado como baseline técnica no Git. Todo avanço posterior deverá seguir o [Anexo 0010 — Controle de Versão e Evidências dos Gates](0010_controle_versao_gates.md).
