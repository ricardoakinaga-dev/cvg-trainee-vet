# Anexo 0027 — Decisão Atual de Integrações, Testes e Execução

**Data:** 2026-08-09  
**Status:** `APLICÁVEL À SPEC, BUILD E CONSTRUÇÃO`  
**Origem:** instruções explícitas do patrocinador nesta sessão.

## 1. Decisões registradas

1. Os protocolos clínicos necessários serão redigidos internamente a partir da literatura consultada, com versão e revisão clínica de Ricardo. Não haverá dependência de protocolo fornecido por terceiro.
2. Não existe etapa obrigatória de calibração, consulta, cotação ou seleção de fornecedor para iniciar a documentação, construir o núcleo ou executar o treinamento interno.
3. A arquitetura adota TypeScript moderno e práticas de engenharia atuais em monorepo modular, com `web`/SPA, API autoritativa e worker separado quando isso melhorar atualização, manutenção e operação.
4. PostgreSQL é a fonte transacional. Qdrant é integração-base para busca semântica interna, com índice derivado e reconstruível. IA é integração-base server-side, estruturada e assistiva.
5. Qdrant e IA não podem decidir estado, nota, gabarito, aprovação clínica, publicação, papel ou autonomia; o núcleo determinístico funciona com esses recursos desligados.
6. Toda construção precisa de testes proporcionais, rastreabilidade requisito→código→contrato→teste→commit→artefato e verificação automatizada no CI.
7. Fotos, PDFs, cópias, dados reais, prontuários, fontes e metadados bibliográficos permanecem fora da experiência do participante. A rastreabilidade existe somente para construção, revisão e auditoria internas.

## 2. Efeito nos gates

- B-07, T2 e melhorias pedagógicas podem ocorrer em paralelo e não bloqueiam a construção do núcleo;
- documentação de `02.SPEC` pode fechar com a baseline técnica já escolhida;
- `03.BUILD` pode ser documentado após o gate 0190;
- código de produto só começa após `04.AUDIT`, `05.AGENT_LOOP-SESSION_PERSISTENCE`, `06.SKILL`, `07.AGENTS` e `08.RUNTIME` estarem 100% escritos e verificados;
- uma falha de Qdrant/IA degrada apenas o recurso assistivo; falha de PostgreSQL impede a operação transacional correspondente;
- qualquer mudança que amplie exposição, dados ou autonomia exige nova decisão explícita.

## 3. Evidências

- [0101 — Visão arquitetural](../02.SPEC/0101_visao_arquitetural.md);
- [0112 — Integrações](../02.SPEC/0112_integracoes.md);
- [0118 — Testes, rastreabilidade e verificação](../02.SPEC/0118_estrategia_de_testes_rastreabilidade_e_verificacao.md);
- [0190 — Validação da SPEC](../02.SPEC/0190_spec_validation.md).

