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
