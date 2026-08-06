# Anexo 0021 — Pacote de fechamento dos gates para iniciar a SPEC

**Projeto:** Sistema CVG de Treinamento Veterinário
**Data:** 2026-08-06
**Responsável:** MV. Ricardo Akinaga
**Status:** `PACOTE_TECNICO_AGUARDA_APROVACAO_HUMANA_DO_COMMIT_F6FEFA1`

## 1. Resultado da auditoria

Os arquivos locais de validação acrescentaram requisitos que não pertencem aos gates canônicos e criaram uma inversão operacional: exigiam produzir e aplicar 120 questões antes de permitir especificar o sistema que apoiará essa aplicação.

A engine canônica de Discovery exige: problema definido, dor validada/contextualizada, fluxo atual compreendido, escopo delimitado, usuários definidos, hipótese de valor clara e riscos documentados. A engine canônica de PRD exige: problema, usuários, fluxos, escopo, regras principais, exceções conhecidas, métricas e riscos. Nenhuma das duas exige baseline aplicada ou metas calibradas para autorizar a SPEC.

Portanto, a correção proposta não é waiver. Ela aplica estritamente as engines canônicas, preserva D-069 e reposiciona B-07 como gate obrigatório de conteúdo/piloto.

## 2. D-101 — Fronteira correta dos gates

**Recomendação:**

1. Discovery e PRD podem ser aprovados com métricas e metas provisórias claramente identificadas;
2. B-07 não bloqueia a SPEC;
3. o blueprint diagnóstico aprovado deve orientar a SPEC;
4. produção, revisão e pré-voo dos 120 itens bloqueiam a aplicação da baseline;
5. aplicação e consolidação da baseline bloqueiam personalização definitiva, metas calibradas e abertura do piloto completo;
6. nenhuma dessas mudanças autoriza BUILD ou coleta real antes dos respectivos gates.

## 3. D-102 — Estados e diferença entre aprovado e concluído

O produto mantém dimensões separadas. Os valores abaixo são códigos canônicos de máquina, sem acentos; a interface usa rótulos em português:

| Dimensão | Estados mínimos |
|---|---|
| progresso | `NAO_INICIADO`, `EM_ANDAMENTO`, `ATIVIDADES_FINALIZADAS`, `CONCLUIDO` |
| avaliação | `NAO_INICIADA`, `RASCUNHO`, `SUBMETIDA`, `EM_CORRECAO`, `CORRIGIDA`, `CONTESTADA`, `ANULADA` |
| domínio | `NAO_AVALIADO`, `DADO_INSUFICIENTE`, `ABAIXO_DO_LIMIAR`, `EM_REMEDIACAO`, `ATINGIDO` |

Transições normais: progresso avança na ordem da tabela; `ATIVIDADES_FINALIZADAS` somente vira `CONCLUIDO` quando a avaliação somativa aplicável estiver aprovada. Avaliação segue `NAO_INICIADA → RASCUNHO → SUBMETIDA → EM_CORRECAO → CORRIGIDA`; `CORRIGIDA → CONTESTADA → CORRIGIDA` cria nova versão, e `ANULADA` exige decisão auditada e recálculo. Domínio pode seguir `NAO_AVALIADO → DADO_INSUFICIENTE` ou `ABAIXO_DO_LIMIAR → EM_REMEDIACAO → ATINGIDO`; nova evidência pode manter `ABAIXO_DO_LIMIAR`, sem reprovação definitiva.

`APROVADO` é um resultado derivado: atingir 70% geral e o requisito crítico aplicável. `CONCLUÍDO` é o rótulo de interface correspondente ao progresso `CONCLUIDO`: atividades obrigatórias finalizadas e aprovação presente quando houver avaliação somativa. Expiração/retirada pertence ao ciclo do conteúdo, não ao estado de aprendizagem. Nunca se usa um único estado para representar as três dimensões.

## 4. D-103 — Componentes críticos

1. aprovação do módulo exige escore geral mínimo de 70%;
2. cada objetivo ou componente marcado como crítico exige 80%;
3. média geral não compensa componente crítico abaixo do limiar;
4. erro crítico segue D-082: reforço no objetivo, explicação e novo caso equivalente, sem punição ou reprovação definitiva;
5. o diagnóstico inicial não aprova/reprova e usa criticidade apenas para recomendar reforço.

## 5. D-104 — Exceções operacionais

| Situação | Regra |
|---|---|
| afastamento ou férias | pausar prazo, preservar progresso e deslocar vencimentos pela duração registrada, sem punição |
| mudança de setor/turno | não altera a trilha no piloto, pois não existe segmentação por setor/turno |
| necessidade de acessibilidade | aplicar WCAG 2.2 AA e permitir ajuste de tempo/formato/prazo autorizado, sem reduzir o objetivo avaliado; registrar somente a acomodação operacional mínima permitida pela extensão D-104 da política D-077, nunca diagnóstico ou justificativa de saúde |
| perda de conexão | salvar incrementalmente, retomar do último estado confirmado e impedir duplicidade de submissão |
| conta desativada | revogar sessões e preservar histórico conforme retenção aprovada |
| conteúdo retirado | bloquear novas exibições, preservar histórico e registrar usuários potencialmente afetados |
| contestação ou mudança de gabarito | usar fluxo versionado, recalcular afetados e preservar a decisão anterior |

Não há restrição adicional de dispositivo, conectividade ou acessibilidade informada. A baseline da SPEC será web responsiva para celular e computador e WCAG 2.2 AA; necessidade concreta descoberta no piloto entra como acomodação, não como bloqueio retroativo do PRD. A extensão D-104 permite somente: identificador, tipo fechado (`TEMPO`, `FORMATO` ou `PRAZO`), escopo, vigência, estado, autorizador e datas. Não permite diagnóstico, laudo, condição de saúde ou justificativa livre.

## 6. D-105 — Diagnóstico, personalização e repetição

1. na trilha curricular completa, todos percorrem os 24 módulos obrigatórios; o diagnóstico não gera dispensa;
2. resultado por domínio abaixo de 70% gera reforço prioritário;
3. resultado entre 70% e 79% gera monitoramento e reforço recomendado;
4. resultado a partir de 80% mantém a sequência regular, sem acelerar ou dispensar módulo;
5. erro em item crítico gera reforço independentemente da média;
6. domínio com 20% ou mais de itens sem resposta recebe o estado de domínio `DADO_INSUFICIENTE` e não gera inferência;
7. a baseline ocorre uma vez na entrada; sessão interrompida é retomada, não reiniciada;
8. depois de concluída, a baseline não é repetida na primeira aplicação; evolução é medida por avaliações de módulo e retenção 30/60/90 dias;
9. a onda piloto inicial valida diagnóstico, núcleo, Emergência e Internação; os demais módulos da V3 são produzidos/publicados em ondas e tornam-se obrigatórios quando elegíveis, sem alterar o currículo completo.

## 7. D-106 — Equivalência das formas

Duas formas são consideradas equivalentes para uso operacional quando:

1. seguem o mesmo blueprint e os mesmos objetivos;
2. mantêm distribuição cognitiva, criticidade, espécie e complexidade comparáveis;
3. não repetem literalmente enunciado ou resposta;
4. possuem gabarito/rubrica, respostas aceitas e erros relevantes testados;
5. recebem aprovação clínica de Ricardo;
6. passam por pré-voo sintético antes do uso.

Comparações quantitativas entre formas serão marcadas como exploratórias até haver amostra suficiente. Isso não impede a definição do requisito nem a SPEC.

## 8. D-107 — Recuperação e critérios de fornecedor

Baseline técnica recomendada para a SPEC:

- RPO máximo de 1 hora;
- RTO máximo de 4 horas;
- backup automático e restauração testada;
- exportação completa de banco e ativos autorais;
- MFA, sessão segura, trilha de auditoria e segregação por ambiente;
- região/localização e subprocessadores documentados;
- contrato compatível com os dados mínimos aprovados;
- custo previsível e ausência de uso dos dados do CVG para treinamento de modelos;
- portabilidade suficiente para trocar fornecedor sem reescrever o domínio.

Esses critérios orientam a SPEC; a escolha do fornecedor não pertence ao PRD.

## 9. D-108 — Protocolos e riscos

### Protocolos internos

Nenhum protocolo interno foi fornecido ao repositório. O inventário inicial registra `NENHUM_PROTOCOLO_FORNECIDO_AO_PROJETO`. Antes da publicação de cada módulo, Ricardo deverá selecionar uma das opções:

- protocolo CVG identificado, versionado e aplicável;
- `NAO_APLICAVEL`;
- `NAO_FORNECIDO` — nesse caso, nenhuma regra interna pode ser presumida e valem as fontes aprovadas na hierarquia D-086.

### Owners e prazos

Ricardo é owner dos riscos do MVP por D-076. Prazos são vinculados à fase:

- risco crítico: resolver antes de publicar ou aplicar o artefato afetado;
- risco alto: plano e controle antes da fase relacionada;
- risco médio: registrar no backlog antes do piloto e monitorar;
- risco baixo: revisar na auditoria.

A segunda revisão veterinária permanece opcional por D-083. O controle obrigatório é aprovação clínica registrada de Ricardo, versão, fonte, data de corte e retirada emergencial.

## 10. Estado após aprovação deste pacote

| Item | Estado esperado |
|---|---|
| Discovery documental | aprovado sobre commit identificado |
| PRD documental | aprovado sobre commit identificado |
| SPEC | autorizada a iniciar pelo readiness review |
| B-07 blueprint | continua em revisão clínica e alimenta a SPEC |
| 120 itens e baseline | obrigatórios antes da aplicação/piloto completo, não antes da SPEC |
| BUILD | continua proibido até aprovação da SPEC |
| T2 da M02 | permanece autorizado em fluxo controlado separado |

## 11. Decisão humana mínima

Uma única aprovação deverá confirmar, sobre o commit identificado:

1. D-101 a D-108;
2. gate Discovery;
3. gate PRD;
4. autorização para iniciar somente a etapa de readiness da SPEC.

**Checkpoint para aprovação:** `f6fefa1` — `docs: prepare canonical gates for spec`.
