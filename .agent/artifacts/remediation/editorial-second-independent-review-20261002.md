# Parecer independente 2 — fluxo editorial

- Data: 2026-10-02
- Revisor fresh: Feynman (`01a0fa81-2c2c-7c53-9d2a-97b95db17cba`)
- Veredito: REVISE; sem P0; dois P2 e dois P3.
- Escopo: contrato de transição genérica, identidade e escopo da leitura interna,
  projeção das ações, SPEC 0111 e testes. Revisão estática; sem execução de
  serviços ou workflows remotos.

## Achados e disposição

1. **P2 — decisões editoriais na transição genérica.** A rota genérica aceitava
   `APROVAR_CLINICAMENTE` e `SOLICITAR_AJUSTES`, podendo mudar status sem a
   decisão versionada. Fechado removendo os dois eventos do schema da rota
   genérica e cobrindo 422 sem chamada ao caso de uso.
2. **P2 — combinação `AUTHOR` + `MODERATOR` ampliava leitura de fonte.** A
   leitura entre autores agora exige `CLINICAL_APPROVER`; autorização base,
   papel e escopo são verificados antes. A fila calcula abertura por item e
   mantém ownership para demais combinações.
3. **P3 — ação de solicitar ajustes aparecia para autor sem identidade
   configurada.** A projeção agora aplica o gate de self-review antes de
   calcular ambas as ações.
4. **P3 — SPEC 0111 não explicava como atribuir papel a outro revisor.** A SPEC
   agora determina bootstrap/provisionamento controlado e explicita que a
   capability `GRANT_CLINICAL_APPROVER` permanece deny-by-default.

## Evidência e limite

Os achados foram implementados e receberam testes de contrato e fronteira. O
parecer seguinte encontrou lacunas adicionais em publicação, concessão por
convite, atomicidade e enumeração; elas foram corrigidas em iteração própria e
estão sob nova revisão fresh. Este parecer não certifica release, publicação ou
runtime live.
