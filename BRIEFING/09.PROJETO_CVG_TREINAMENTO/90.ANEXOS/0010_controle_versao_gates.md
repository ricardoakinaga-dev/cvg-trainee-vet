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

## 2. Convenção de commits

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

## 3. Evidência mínima por gate

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

## 4. Política para as fontes técnicas

Os PDFs não serão armazenados no Git por tamanho, licenciamento e restrição de redistribuição. Sua integridade será controlada por nome, metadados, quantidade de páginas e SHA-256.

| Fonte local | SHA-256 verificado em 2026-08-05 |
|---|---|
| `Ettinger's Textbook of Veterinary Internal Medicine, 9th Edition (VetBooks.ir).pdf` | `429d0fbf568664c9e01d984cd272bc54195bf8d2aa54ce7caa902f28859875b8` |
| `Fossum.Cirurgia de Pequenos Animais_ 4ª Edição-ilovepdf-compressed.pdf` | `df0138e8b5c2b25adce71f8a6549e3f9d6e26e97bdc2a9b559b22bcafd04d2a0` |
| `Tratado de Medicina Interna de - Marcia Marques Jerico, Joao Ped-ilovepdf-compressed-1.pdf` | `ef781de2bd48e940f193926b62b71375871da586e080d8e1dbf7526d16b04628` |
| `sistema_treinamento_veterinarios_cvg.pdf` | `baa14c7dc528dd8f595dc54f611e4e90d004b0d347fd846475dec4ec2f0a761b` |

Qualquer alteração de hash exige interrupção da produção de conteúdo dependente, nova verificação da fonte e registro de decisão.

## 5. Baseline inicial

O estado encontrado em 2026-08-05 será preservado como baseline técnica de auditoria. Essa baseline:

- Não significa aprovação do Discovery ou do PRD;
- Contém inconsistências e bloqueios conhecidos;
- Serve como ponto de comparação para as correções subsequentes;
- Deve receber tag local de baseline após revisão e commit;
- Não autoriza SPEC, BUILD ou produção de conteúdo clínico.

## 6. Checklist de transição

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

