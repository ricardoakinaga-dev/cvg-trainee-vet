# Anexo 0010 — Controle de Versão e Evidências dos Gates

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Data de instituição:** 2026-08-05  
**Status:** `REGRA OBRIGATÓRIA APROVADA PELO PATROCINADOR`  
**Escopo:** Discovery, PRD, SPEC, BUILD, PILOTO, AUDIT e melhoria contínua.

## 1. Regra obrigatória

Nenhuma fase, gate ou decisão formal poderá avançar sem um checkpoint Git verificável. O checkpoint não substitui a aprovação humana: ele preserva exatamente o conjunto de documentos e evidências que foi revisado.

Cada avanço exige, nesta ordem:

1. Atualizar os artefatos da fase e sua matriz de rastreabilidade;
2. Revisar todas as alterações com `git diff`;
3. Verificar ausência de segredos, dados pessoais indevidos e material protegido reproduzido sem autorização;
4. Executar as validações aplicáveis, incluindo links, consistência de IDs, critérios de aceite e testes técnicos quando existirem;
5. Manter o working tree sem alterações não explicadas;
6. Criar commit em formato Conventional Commits;
7. Registrar no documento do gate o commit avaliado, o aprovador, a data, a decisão e as ressalvas;
8. Somente depois da aprovação humana iniciar a fase seguinte.

Se qualquer condição falhar, o gate permanece `BLOQUEADO` ou `AGUARDANDO_APROVAÇÃO_HUMANA`.

## 2. Proibição de segredos no Git

É terminantemente proibido commitar, em qualquer branch ou tag:

- Chaves de API, tokens de acesso ou tokens de sessão;
- Senhas, credenciais de banco de dados ou strings de conexão com segredo;
- Chaves privadas, certificados privados ou arquivos de assinatura;
- Arquivos `.env` reais, cofres exportados ou arquivos de credenciais;
- Dados pessoais, clínicos ou corporativos usados como segredo de autenticação;
- Segredos ofuscados, codificados ou criptografados junto com a chave de recuperação.

Valores de exemplo somente podem ser versionados quando forem inequivocamente fictícios, sem acesso a qualquer ambiente real. Arquivos de exemplo devem usar nomes como `.env.example` e placeholders como `CHANGE_ME`.

Se um segredo for identificado antes do commit, o commit fica bloqueado. Se for identificado depois do commit, o trabalho deve parar para:

1. Revogar ou rotacionar imediatamente o segredo;
2. Remover o segredo dos arquivos e, quando necessário, do histórico Git;
3. Verificar logs, branches, tags e sistemas externos para exposição equivalente;
4. Registrar o incidente sem reproduzir o valor secreto;
5. Reexecutar a varredura antes de liberar o gate.

O `.gitignore` é apenas uma barreira auxiliar e não substitui a revisão do diff nem a varredura de segredos.

## 3. Convenção de commits

Formato obrigatório:

```text
<tipo>(<escopo opcional>): <descrição objetiva no imperativo>
```

Tipos previstos:

- `docs`: documentação, decisões, evidências e correções editoriais;
- `feat`: nova capacidade do produto;
- `fix`: correção de comportamento ou não conformidade;
- `test`: testes e evidências automatizadas;
- `refactor`: reorganização sem alteração de comportamento;
- `chore`: manutenção e controle do repositório;
- `ci`: automação de validação e entrega.

Commits de gate não podem misturar alterações não relacionadas. É proibido usar `--no-verify` para contornar validações.

## 4. Evidência mínima por gate

| Campo | Obrigatório |
|---|---:|
| fase e gate | sim |
| commit revisado | sim |
| artefatos incluídos | sim |
| validações executadas e resultados | sim |
| pendências e riscos residuais | sim |
| nome e papel do revisor | sim |
| nome e papel do aprovador | sim |
| decisão e data | sim |
| próximo passo autorizado | sim |

Um status documental não é evidência suficiente sem referência ao commit que o sustenta.

## 5. Política para as fontes técnicas

Os PDFs não serão armazenados no Git por tamanho, licenciamento e restrição de redistribuição. Sua integridade será controlada por nome, metadados, quantidade de páginas e SHA-256.

Por D-075, nenhum PDF, página, imagem, tabela, OCR, embedding ou outro derivado do arquivo-fonte pode ser commitado. O SHA-256 é apenas um controle local de integridade. Eventual automação dos PDFs será decidida separadamente em D-033 e não bloqueia o MVP manual.

| Fonte local | SHA-256 verificado em 2026-08-05 |
|---|---|
| `Ettinger's Textbook of Veterinary Internal Medicine, 9th Edition (VetBooks.ir).pdf` | `429d0fbf568664c9e01d984cd272bc54195bf8d2aa54ce7caa902f28859875b8` |
| `Fossum.Cirurgia de Pequenos Animais_ 4ª Edição-ilovepdf-compressed.pdf` | `df0138e8b5c2b25adce71f8a6549e3f9d6e26e97bdc2a9b559b22bcafd04d2a0` |
| `Tratado de Medicina Interna de - Marcia Marques Jerico, Joao Ped-ilovepdf-compressed-1.pdf` | `ef781de2bd48e940f193926b62b71375871da586e080d8e1dbf7526d16b04628` |
| `sistema_treinamento_veterinarios_cvg.pdf` | `baa14c7dc528dd8f595dc54f611e4e90d004b0d347fd846475dec4ec2f0a761b` |

Qualquer alteração de hash exige interrupção da produção de conteúdo dependente, nova verificação da fonte e registro de decisão.

## 6. Baseline inicial

O estado encontrado em 2026-08-05 será preservado como baseline técnica de auditoria. Essa baseline:

- Não significa aprovação do Discovery ou do PRD;
- Contém inconsistências e bloqueios conhecidos;
- Serve como ponto de comparação para as correções subsequentes;
- Deve receber tag local de baseline após revisão e commit;
- Não autoriza SPEC, BUILD ou produção de conteúdo clínico.

## 7. Checklist de transição

```text
[ ] artefatos da fase completos
[ ] decisões propagadas para todos os documentos afetados
[ ] git diff revisado
[ ] segredos, dados pessoais e direitos autorais verificados
[ ] validações/testes concluídos
[ ] working tree explicado e controlado
[ ] commit convencional criado
[ ] commit registrado no gate
[ ] revisores identificados
[ ] aprovação humana registrada
[ ] fase seguinte explicitamente autorizada
```

## 8. Checkpoint da matriz curricular clínica V2

| Campo | Registro |
|---|---|
| Fase | correção documental do PRD; não aprova o gate nem inicia SPEC/BUILD |
| Commit de conteúdo revisado | `7285249` — `docs: define evidence-based clinical curriculum` |
| Artefato principal | `01.PRD/0016_programa_curricular_clinico.md` |
| Escopo | 16 módulos, 96 objetivos, 128 casos digitais-base, banco de 1.440 itens, diagnóstico de 120 itens, piloto e ciclo completo |
| Revisões | revisão clínica veterinária e revisão geral de qualidade; nenhum bloqueador estrutural restante |
| Validações | `git diff --check`; 31 Markdown com links locais válidos; 16 módulos/objetivos/erros críticos conferidos; varredura de padrões de segredo sem ocorrência; nenhum PDF incluído |
| Pendências | D-070 (correção de resposta construída), D-081 (carga/cadência) e D-082 (efeito do erro crítico na conclusão) |
| Responsável pela validação humana | MV. Ricardo Akinaga |
| Próximo passo proposto | decidir D-081 entre três cadências; depois tratar D-082, item por item |
| Tag do checkpoint | `checkpoint-curriculum-v2-2026-08-05` |

## 9. Checkpoint D-081 — carga e cadência curricular

| Campo | Registro |
|---|---|
| Decisão | Alternativa 1 aprovada por MV. Ricardo Akinaga em 2026-08-05 |
| Piloto | 14 semanas; 30–40 horas; aproximadamente 2–3 horas por semana |
| Ciclo completo | 34 semanas; faixa de planejamento de 90–115 horas |
| Efeito | substitui D-016/RN-076 de 3 h/mês e D-061/RN-071 de 12 semanas |
| Commit de conteúdo | `19e2170` — `docs: approve curriculum cadence` |
| Validações | `git diff --check`; links locais válidos; varredura de padrões de segredo sem ocorrência; nenhum PDF incluído |
| Pendências remanescentes | D-062 (validação clínica detalhada da ordem), D-070 (correção de resposta construída) e D-082 (erro crítico) |
| Próximo item | D-082, com três alternativas e recomendação clínica |
| Tag | `gate-d081-curriculum-cadence-2026-08-05` |

## 10. Checkpoint D-082 — remediação educativa de erro crítico

| Campo | Registro |
|---|---|
| Decisão | Alternativa 1 aprovada por MV. Ricardo Akinaga em 2026-08-06 |
| Regra | somente o objetivo afetado fica em reforço; feedback, conteúdo curto e novo caso equivalente; decisão segura libera o avanço |
| Proporcionalidade | treinamento interno e não competitivo; sem eliminação, punição, ranking ou reprovação definitiva |
| Persistência | orientação individual por Ricardo/mentor, mantendo caráter educativo |
| Commit de conteúdo | `ee71875` — `docs: approve educational critical-error remediation` |
| Validações | `git diff --check`; links locais válidos; varredura de padrões de segredo sem ocorrência; nenhum PDF incluído |
| Próximo item | D-062 — ordem de produção/validação dos módulos |
| Tag | `gate-d082-educational-remediation-2026-08-06` |

## 11. Checkpoint D-062 — ordem de produção curricular

| Campo | Registro |
|---|---|
| Decisão | Alternativa 1 aprovada por MV. Ricardo Akinaga em 2026-08-06 |
| Primeira onda | NC-01 → NC-02 → NC-03 → ponte NC-04/NC-05 + EM-01 → ponte NC-04/NC-05 + IN-01 → caso integrador |
| Expansão | produzir os demais módulos em ondas após corrigir o formato com o piloto |
| Proporcionalidade | não exige produzir os 16 módulos antes de iniciar o piloto autorizado |
| Commit de conteúdo | `796feb5` — `docs: approve integrated pilot production order` |
| Validações | `git diff --check`; links locais válidos; varredura de padrões de segredo sem ocorrência; nenhum PDF incluído |
| Próximo item | D-070 — correção simples de respostas construídas |
| Tag | `gate-d062-integrated-pilot-order-2026-08-06` |

## 12. Checkpoint D-070 — correção estruturada adaptativa

| Campo | Registro |
|---|---|
| Decisão | Alternativa 2 aprovada por MV. Ricardo Akinaga em 2026-08-06 |
| Modelo inicial | campos estruturados e correção automática por rubrica |
| Escalonamento | revisão humana por ambiguidade, contestação, possível erro crítico ou falhas repetidas; somente a atividade afetada migra |
| Regra de avaliabilidade | pergunta/caso sem correção funcional testada é bloqueado antes do treinamento e deve ser redesenhado, estruturado ou destinado à correção humana |
| Commit de conteúdo | `5e5b62c` — `docs: approve adaptive structured response scoring` |
| Validações | `git diff --check`; links locais válidos; varredura de padrões de segredo sem ocorrência; nenhum PDF incluído |
| Próximo item | B-07 — blueprint das 120 questões diagnósticas |
| Tag | `gate-d070-adaptive-structured-scoring-2026-08-06` |

## 13. Checkpoint B-07.1 — blueprint diagnóstico em rascunho

| Campo | Registro |
|---|---|
| Fase | correção de Discovery/PRD; B-07 em elaboração |
| Artefato | 90.ANEXOS/0012_blueprint_diagnostico_b07.md |
| Conteúdo | 120 itens em três sessões de 40, cobertura por domínio, matriz cognitiva, criticidade, formatos estruturados e critérios de pré-voo |
| Commit do rascunho | 8bed361 — docs: add B-07 diagnostic blueprint |
| Estado | rascunho operacional; não fecha B-07 e não aprova qualquer gate |
| Validações | git diff --check; contagens 40/40/40; matriz cognitiva 20/8/8/4 por sessão; varredura de segredos sem ocorrência; nenhum PDF staged |
| Aprovação humana | não registrada; revisão clínica independente ainda necessária |
| Próximo item | nomear segundo MV revisor, validar o blueprint, produzir/testar os 120 itens e só então solicitar autorização para aplicação |

## 14. Checkpoint D-083 a D-086 — governança única e trilha curricular V3

| Campo | Registro |
|---|---|
| Fase | redesenho documental do PRD; não aprova os gates nem autoriza SPEC/BUILD |
| Decisões | D-083: Ricardo como único aprovador clínico obrigatório; D-084: 24 meses/duas partes; D-085: casos fictícios, pesquisa aberta e avaliação mista; D-086: três obras como base com camada de atualização |
| Artefatos principais | 01.PRD/0017_programa_curricular_24_meses.md; 90.ANEXOS/0013_pesquisa_melhores_praticas_trilha_24_meses.md |
| Escopo V3 | 24 módulos, 96 sessões e 149 horas; Parte 1 clínica médica/emergência/internação; Parte 2 cirurgia/especialidades/integração |
| Commit do conteúdo | `c1d3023` — `docs: define 24-month veterinary curriculum` |
| Validações | `git diff --cached --check`; 24 módulos; 96 sessões curriculares; cálculo de 149 h; 80 links locais válidos; varredura de segredos sem ocorrência; nenhum PDF rastreado |
| Aprovação humana | direção fornecida por MV. Ricardo Akinaga em 2026-08-06; confirmação final da carga e da fatia vertical ainda necessária |
| Efeito no checkpoint B-07.1 | a exigência histórica de segundo MV registrada na seção 13 foi substituída por D-083; B-07 continua aberto por falta de produção, pré-voo e aplicação |
| Próximo item | confirmar carga/cadência V3 e produzir a fatia vertical do Mês 2 antes da produção em escala |
| Tag | não criada — não é aprovação de gate |

## 15. Checkpoint D-087 — fatia vertical do Mês 2 v0.1.0

| Campo | Registro |
|---|---|
| Decisão de origem | patrocinador aprovou 149 horas, SLA de cinco dias úteis e autoria da fatia vertical em 2026-08-06 |
| Artefatos | Anexos 0014 a 0017: critérios, participante, facilitador e pré-voo |
| Conteúdo | quatro sessões/360 min; dois casos fictícios; 31 itens objetivos/estruturados; duas respostas abertas; rubricas e remediação |
| Fontes | Ettinger caps. 90–96, 119–124 e 131; Tratado e Fossum com localizadores; AAHA 2024, RECOVER 2024, WSAVA 2022 e AVHTM/TRACS |
| Testes | ciclo RED por ausência dos artefatos; GREEN estrutural com IDs correspondentes, separação de gabaritos, links locais, ausência de segredos e nenhum PDF rastreado |
| Revisão | primeira passagem: 0 crítico, 2 altos e 4 médios; todos corrigidos; segunda passagem: PASS sem novo achado crítico/alto |
| Commit de conteúdo | `91cb9e7` — `docs: add emergency module vertical slice` |
| Estado | `READY_FOR_CLINICAL_REVIEW`; bloqueado para aplicação |
| Próxima decisão | Ricardo aprovar, ajustar ou rejeitar a v0.1.0 para ensaio controlado e cronometrado |
| Efeito nos gates | não fecha B-07, Discovery ou PRD; não autoriza SPEC/BUILD nem produção em escala |
| Tag | não criada — aprovação clínica ainda pendente |

## 16. Checkpoint D-088 — aprovação clínica e preparação T0/T1

| Campo | Registro |
|---|---|
| Decisão | M02 v0.1.0 aprovada clinicamente por MV. Ricardo Akinaga em 2026-08-06 para ensaio controlado e cronometrado |
| Escopo autorizado | T0 sintético, T1 documental e T2 com dois a três veterinários; sem publicação, uso somativo, certificação, coorte completa ou produção em escala |
| Artefatos | Anexo 0018 — protocolo T0–T3; Anexo 0019 — oito respostas sintéticas e teste das rubricas |
| T0 | reexecutado; `PASS_SINTETICO_COM_LIMITACOES`; RA02-SYN-B 5/10 e RA02-SYN-C 3/10 reproduzíveis por dimensão |
| T1 | `PASS_DOCUMENTAL_COM_LIMITES`; 40 arquivos com links locais válidos, 31 IDs correspondentes, oito perfis sintéticos e nenhum PDF rastreado |
| Revisão | primeira passagem: 0 crítico, 3 altos, 2 médios e 1 baixo; todos corrigidos; segunda passagem: PASS sem novo achado crítico/alto |
| Commit de conteúdo | `2d0d608` — `docs: authorize controlled emergency module trial` |
| Estado T2 | autorizado, mas bloqueado até aviso D-077 registrar base legal, canal, entrega, versão e data antes da primeira coleta real |
| Próxima decisão | Ricardo, com suporte jurídico/DPO quando aplicável, completar o aviso; após T2 decidir manter v0.1.0, criar v0.1.1 ou bloquear M02 |
| Efeito nos gates | não fecha B-07, Discovery ou PRD; não autoriza SPEC/BUILD |
| Tag | não criada — T2 ainda não executado |

## 17. Checkpoint D-089 — simplificação da liberação de T2

| Campo | Registro |
|---|---|
| Decisão | descartar o gate documental adicional criado durante a revisão do protocolo |
| Escopo mantido | dois a três veterinários autorizados; comunicação operacional simples; dados mínimos de D-077; casos integralmente fictícios |
| Proibições mantidas | dados de pacientes ou tutores, prontuários, gravações, ranking, RH, punição e uso somativo |
| Estado T2 | `READY_FOR_CONTROLLED_TRIAL`; pronto para seleção e agendamento dos participantes |
| Commit de conteúdo | `b85184b` — `docs: remove controlled trial privacy gate` |
| Próxima decisão | após T2, manter v0.1.0, criar v0.1.1 ou bloquear M02 |
| Efeito nos gates | não fecha B-07, Discovery ou PRD; não autoriza SPEC/BUILD nem produção em escala |

## 18. Checkpoint técnico D-101 a D-108 — gates pré-SPEC

| Campo | Registro |
|---|---|
| Escopo | correção da fronteira canônica; reexecução de Discovery e PRD; nenhuma SPEC/BUILD iniciada |
| Decisões propostas | D-101 a D-108: fronteira de B-07, estados, criticidade, exceções, diagnóstico, equivalência, recuperação, fornecedores, protocolos e riscos |
| Commit do conteúdo revisado | `f6fefa1` — `docs: prepare canonical gates for spec` |
| Artefatos centrais | 0090 Discovery; 0090 PRD; Anexo 0021; política D-077; backlog e runtime |
| Validações | `git diff --cached --check`; 25 Markdown com links locais válidos; 100 linhas D-* únicas; varredura de segredos sem ocorrência |
| Revisão independente | primeira revisão sem crítico e com três achados altos materiais; acomodação, escopo da onda piloto e contrato de estados corrigidos; reavaliação `PASS` |
| Estado do Discovery | aprovado tecnicamente; aguarda aprovação humana sobre este checkpoint |
| Estado do PRD | aprovado tecnicamente; aguarda aprovação humana depois do Discovery, no mesmo checkpoint |
| B-07 | gate pré-piloto; não bloqueia SPEC, mas bloqueia baseline/piloto completo |
| Próxima decisão | Ricardo aprovar D-101 a D-108, Discovery, PRD e somente a readiness da SPEC, nessa ordem |
| BUILD | proibido até aprovação da SPEC |
