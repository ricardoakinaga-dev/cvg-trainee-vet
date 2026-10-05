# Parecer independente — autorização editorial

- Data: 2026-10-01
- Revisor fresh: Epicurus (`01a0fa73-1352-7bf0-be98-78bda44b893e`)
- Escopo: leitura estática da matriz de autorização, fila de revisão, fronteira API, SPEC e testes; sem execução de serviços ou workflow remoto.
- Veredito: nenhum achado P0/P1. Um apontamento P2 pediu confirmar o contrato para `SOLICITAR_AJUSTES`: o revisor clínico distinto podia aprovar conteúdo de outro autor, mas não possuía `MODERATE_CONTENT`.

## Disposição

SPEC 0111 já separava `APPROVE_CLINICAL_CONTENT` de `MODERATE_CONTENT`. A decisão de produto autoriza `CLINICAL_APPROVER` ativo e no escopo a aprovar conteúdo de outro autor; ela não concede moderação geral. SPEC 0106 e adendo 0191 foram clarificados para dizer que solicitar ajustes continua exigindo `MODERATE_CONTENT` (`MODERATOR`/`ADMIN`). A implementação preserva essa separação.

Foram adicionadas regressões para negar `SOLICITAR_AJUSTES` ao papel clínico isolado, manter a projeção da ação coerente, negar self-review quando a identidade configurada diverge, rejeitar identidade forjada no corpo, barrar itens fora do escopo e filtrar itens de outros autores para contas somente `AUTHOR`.

## Evidência e limite

A suíte focal atual passou 56/56 sob Node 22.23.2. A segunda revisão independente da clarificação e do código atual ainda está pendente; este parecer não certifica release, publicação clínica ou runtime live.
