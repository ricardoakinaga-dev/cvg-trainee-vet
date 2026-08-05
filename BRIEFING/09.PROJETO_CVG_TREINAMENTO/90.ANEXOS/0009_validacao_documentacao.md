# Anexo 0009 — Validação da Documentação

**Projeto:** Sistema CVG de Treinamento Veterinário
**Data:** 2026-08-05
**Status:** `EM AUDITORIA — BASELINE TÉCNICA NÃO APROVADA`
**Escopo:** verificação documental da fase de briefing (Discovery + PRD) contra as diretrizes do `sistema_treinamento_veterinarios_cvg.md` e verificação física dos arquivos-fonte locais.

---

## 1. Escopo da validação

1. Leitura integral da documentação do briefing (`BRIEFING/09.PROJETO_CVG_TREINAMENTO/`): README, Discovery (0000 a 0090), PRD (0010 a 0090) e anexos (0001 a 0008);
2. Verificação das diretrizes institucionais (`sistema_treinamento_veterinarios_cvg.md`);
3. Verificação física dos três PDFs-fonte quanto a: número de páginas, estrutura (partes/seções/capítulos), título, autor, edição e ano;
4. Verificação de consistência interna: decisões de gate, regras de negócio (RN), decisões (D), bloqueios (B) e hierarquia de fontes.

Esta verificação preserva achados e correções já presentes na baseline, mas não representa aprovação final. Os gates permanecem sujeitos às engines canônicas, ao fechamento das pendências e à aprovação humana de um commit identificado.

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
| Microlearning espaçado | unidade 8–15 min; tempo protegido 3 h/mês; retenção 30/60/90 dias | ✅ |
| Simulação/prática deliberada | simulação digital incluída para conhecimento/raciocínio; prática presencial excluída e bloqueada pelo `GATE-EXP-PRAT-01` | ✅ |
| Mentoria e feedback | papéis de mentor/preceptor; plano individual em reprovação recorrente | ✅ |
| Casos digitais estruturados | atividade digital de caso incluída; formato síncrono ou assíncrono ainda não decidido | ✅ com pendência de formato |
| Reuniões de melhoria sem culpabilização | referência organizacional externa à plataforma inicial; sujeita a LGPD | ✅ como referência externa |
| Avaliação por resultados (não só presença) | painel inicial restrito a KPIs educacionais digitais; comportamento e resultados assistenciais ficam externos | ✅ |
| 5 níveis de supervisão (CBVE) | referencial externo ao produto; não registrados nem avaliados na primeira versão | ✅ |

## 5. Resultado provisório

```text
BASELINE DOCUMENTAL: REGISTRADA PARA AUDITORIA (2026-08-05)
VALIDAÇÃO FINAL: PENDENTE
ESTRUTURA DAS FONTES: VERIFICADA FISICAMENTE (TRATADO, ETTINGER, FOSSUM)
CONSISTÊNCIA INTERNA: PARCIAL — D-040 A D-044 SINCRONIZADOS; OUTRAS CONTRADIÇÕES PERMANECEM
FONTE CIRÚRGICA: INCORPORADA (FOSSUM — F-03)
STATUS DOS GATES: DISCOVERY E PRD REPROVADOS — EM CORREÇÃO
CONFORMIDADE DO CRITÉRIO DE GATE COM AS ENGINES CANÔNICAS: ALINHADA; CHECKLISTS AINDA INCOMPLETOS
PENDÊNCIAS DE GATE: B-01 (ENTREVISTAS), B-02 (INVENTÁRIO), B-03 (MODELO D-071; COORDENAÇÃO INTERINA D-072; NOMEAÇÕES/ACEITES PENDENTES),
B-04 (D-074: WORKFLOW DEFINIDO; VERIFICAÇÃO JURÍDICA PENDENTE), B-05 (RASCUNHO D-073 PREPARADO; VALIDAÇÃO FORMAL LGPD PENDENTE), B-07 (BASELINE)
SPEC/BUILD/AUDIT: BLOQUEADOS / NÃO INICIADOS
```

## 6. Correções encontradas na baseline

1. `90.ANEXOS/0005_decisoes_pendentes.md` — D-040 a D-044 atualizados para refletir decisões confirmadas pelo patrocinador em 2026-08-05, preservadas como insumos para a reexecução do gate;
2. `90.ANEXOS/0001_governanca_fonte_conhecimento.md` — Fossum adicionado como F-03 (ficha, hierarquia, identificador, mapeamento macro, direitos autorais);
3. `README.md` — seção de fontes clínicas atualizada com o Fossum.

Essas alterações não equivalem a aprovação do conjunto documental. Sua consistência global será revisada item por item.

## 7. Itens que permanecem para validação humana (não alterados)

- B-01: fluxo atual via entrevistas (roteiro pronto — anexo 0007);
- B-02: inventário de usuários e delimitação da coorte;
- B-03: Ricardo coordena operacionalmente as correções por D-072, sem preencher cadeiras; concluir nomeações, suplências, aceites, conflitos e instalação dos comitês conforme D-071/0006;
- B-04: D-074 definiu consulta/validação técnica, conteúdo autoral sem nomes visíveis e proveniência interna; verificar juridicamente as três cópias, a consulta institucional e o processamento automatizado;
- B-05: validar formalmente o rascunho conservador do Anexo 0011 pelo responsável LGPD independente; até lá, nenhuma coleta pessoal de participante, paciente ou tutor está autorizada;
- B-07: baseline (diagnóstico inicial na coorte).

## 8. Controle de versão

O estado atual será preservado como baseline técnica no Git. Todo avanço posterior deverá seguir o [Anexo 0010 — Controle de Versão e Evidências dos Gates](0010_controle_versao_gates.md).
