# Política de fonte clínica — CVG

**Data:** 2026-08-10
**Status:** ativa no caminho de publicação automática
**Escopo:** conteúdo de treinamento, B-07, catálogo dos 24 módulos e pré-voo de publicação

## Regra imutável

O CVG aceita como fonte clínica somente os três PDFs abaixo. A identidade é determinada pelo nome exato, SHA-256 e quantidade de páginas; referências fora desse registro falham no pré-voo automático.

| Código | Arquivo exato | Páginas | SHA-256 |
| --- | --- | ---: | --- |
| `BOOK_ETTINGER_9E` | `Ettinger's Textbook of Veterinary Internal Medicine, 9th Edition (VetBooks.ir).pdf` | 2801 | `429d0fbf568664c9e01d984cd272bc54195bf8d2aa54ce7caa902f28859875b8` |
| `BOOK_FOSSUM_4E` | `Fossum.Cirurgia de Pequenos Animais_ 4ª Edição-ilovepdf-compressed.pdf` | 5008 | `df0138e8b5c2b25adce71f8a6549e3f9d6e26e97bdc2a9b559b22bcafd04d2a0` |
| `BOOK_JERICO_CAES_GATOS` | `Tratado de Medicina Interna de - Marcia Marques Jerico, Joao Ped-ilovepdf-compressed-1.pdf` | 7047 | `ef781de2bd48e940f193926b62b71375871da586e080d8e1dbf7526d16b04628` |

O manifesto operacional equivalente está em [`clinical-sources.json`](../clinical-sources.json), e a verificação executável está em [`scripts/verify-clinical-sources.mjs`](../scripts/verify-clinical-sources.mjs). A verificação executada nesta rodada foi:

```text
pnpm verify:clinical-sources
clinical source governance: PASS (3 immutable PDFs, hashes verified)
```

## Publicação e bloqueios

- B-07 e os 24 packs do currículo passam por registro de fonte, pré-voo técnico e projeção pública redigida.
- A publicação ativa usa `PUBLICAR_AUTOMATICAMENTE` depois da verificação automática da fonte; não há gate humano clínico obrigatório nesse caminho.
- A rota, o contrato e o caso de uso de revisão clínica de autoria foram removidos do caminho executável. A tabela e os checks históricos da migration 0014 permanecem somente para compatibilidade e preservação de dados existentes; nenhum revisor pode ser exigido por eles.
- A IA, o Qdrant e a interface não podem inventar fonte, editar estado, publicar ou alterar gabarito.
- Autenticação, autorização server-side, proteção de segredos, redaction, auditoria e testes continuam controles técnicos do produto; não são autorização clínica adicional.

## Limite verificável

O código garante que o catálogo e os registros de autoria apontem apenas para esses três identificadores e rejeita marcadores de fontes externas. Ele não transforma uma checagem de hash em prova semântica de que cada frase de um texto novo aparece literalmente em um livro. Por isso, a regra de implementação é: não adicionar texto clínico novo fora de um fluxo de conteúdo cuja origem esteja registrada nesses três livros; os artefatos do repositório não armazenam trechos, PDFs, fotos, prontuários ou dados de participantes.

Esta política elimina a autorização clínica humana como bloqueio de software, mas não declara competência prática, segurança clínica de atendimento ou liberação hospitalar sem execução dos testes e configurações de produção correspondentes.
