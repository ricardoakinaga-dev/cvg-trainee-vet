# Parecer independente 3 — publicação e transação editorial

- Data: 2026-10-02
- Revisor fresh: Chandrasekhar (`01a0fa99-2c2c-7c53-9d2a-97b95db17cba`)
- Veredito: REVISE; sem P0; um P1, dois P2 e um P3.
- Escopo: autorização, revisão editorial, publicação, convite, persistência,
  SPEC/PRD e testes. Leitura estática; sem execução de testes ou serviços.

## Achados e disposição

1. **P1 — aprovação de revisor distinto satisfazia publicação sem a aprovação
   registrada de Ricardo exigida por RF-035.** O repositório de conteúdo agora
   seleciona `reviewerId` e só marca o gate pronto quando a decisão clínica
   mais recente foi registrada pelo `approvedClinicalApproverId` configurado no
   servidor. Testes cobrem revisor distinto bloqueado e identidade configurada
   aprovada; SPEC 0106/0111/0191 explicam a fronteira.
2. **P2 — convite comum podia conceder `CLINICAL_APPROVER` apesar de
   `GRANT_CLINICAL_APPROVER` ser deny-by-default.** `createInvitation` agora
   verifica a capability separada antes de gerar token ou persistir. Como a
   capability segue negada por padrão, o convite comum falha fechado; a SPEC
   identifica bootstrap/provisionamento controlado como mecanismo de atribuição.
3. **P2 — decisão e transição eram commits separados.** A revisão concluída
   agora usa `commitReviewTransition`: CAS do status, decisão, preflight,
   outbox e auditoria são gravados na mesma transação PostgreSQL. Falha em
   qualquer escrita reverte o conjunto. O adaptador tem teste de uma transação,
   CAS e conjunto de escrita; não foi executado PostgreSQL live nesta rodada.
4. **P3 — leitura interna diferenciava registro inexistente de registro de
   outro autor.** Ambas as condições agora retornam o mesmo 404; a regressão
   compara status e corpo para `AUTHOR` + `MODERATOR`.

## Evidência e limite

Após as correções, cinco arquivos focais passaram 73/73 em Node 22.23.2.
Builds de `@cvg/application` e `@cvg/persistence`, typecheck de `@cvg/api`,
Prettier e `git diff --check` passaram. Uma nova revisão fresh está em
andamento; a evidência é local e sintética, sem publicação clínica, PostgreSQL
live, workflow remoto, commit, push ou deploy.
