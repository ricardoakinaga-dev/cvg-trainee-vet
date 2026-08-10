# 0702 — Gates de Revisão e Segurança

## Antes de qualquer commit

- diff revisado e `git diff --check`;
- nenhum segredo, token, senha, certificado ou prompt sensível;
- input validado; SQL parametrizado; XSS/CSRF/authz cobertos;
- testes unitários, integração, contrato e E2E aplicáveis;
- cobertura global ≥80%;
- rastreabilidade e manifesto atualizados;
- conteúdo/DTO/log sem fonte, PDF, foto ou metadado participante.

## Depois de modificar código

Executar code review; security review quando houver autenticação, entrada, endpoint, integração, segredo, pagamento ou dado sensível; E2E dos fluxos críticos; atualizar auditoria de sprint.

## Resposta a problema crítico

Parar a entrega, registrar causa/impacto/evidência, corrigir antes de prosseguir, rotacionar segredo exposto, procurar ocorrências semelhantes e adicionar teste de regressão.

