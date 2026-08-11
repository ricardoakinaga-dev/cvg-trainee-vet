# 0418 — Operational Experience Audit

## Reauditoria vigente — 2026-08-11

O E2E sintético 12/12 e os checks de acessibilidade padrão passaram. O login e a jornada M02 funcionaram em chamadas HTTP reais contra o runtime ativo, mas o E2E real completo não iniciou porque o fixture falhou sob RLS. O build web exige CVG_API_INTERNAL_URL para manter o proxy, e essa variável não está garantida no fluxo padrão.

Resultado: PARTIAL no recorte F3-S3 + complementos F3-S4/F3-S6 — há fluxo E2E sintético de participante e proteção de borda HTTP testada, mas a API é interceptada; autoria/operação, integração real, acessibilidade completa e demais jornadas ainda não foram executadas.

## Verificar com dados sintéticos

- login, convite, recuperação e expiração de sessão;
- próxima ação, trilha, atividade, salvar/retomar, submissão e feedback;
- fila de correção, contestação, publicação/retirada e autoria interna;
- loading, empty, error, forbidden, stale e retry;
- teclado, foco, leitor de tela, contraste e mensagens de erro;
- mensagem de degradação quando Qdrant/IA falharem;
- ausência de fonte, foto, PDF, gabarito e metadado na experiência participante.

Registrar tarefa, papel, ambiente, passo, resultado, fricção, severidade e sugestão. Não usar session replay, gravação ou caso real.

Evidência limitada: API health, envelopes públicos e três fluxos Playwright sintéticos foram testados; loading completo, empty, keyboard, leitor de tela, mobile, mensagens por papel e API real aguardam fases seguintes.
