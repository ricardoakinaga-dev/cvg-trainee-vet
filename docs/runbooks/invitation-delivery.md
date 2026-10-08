# Runbook — entrega de convites e recuperação de conta

Achado OP-06 (M11). Não existe provedor de e-mail/SMS no produto: a API
devolve o token de convite e de recuperação na resposta autenticada ao
staff (`apps/api/src/features/invitations/invitations.handler.ts`). Integrar
um provedor é feature nova e exige PRD/SPEC; até lá vale este procedimento.

## Convite de participante

1. Staff com capacidade de convite cria o convite em `/operations` (ou via
   API `POST /api/v1/invitations`) e recebe o token uma única vez.
2. Entregar o link de ativação ao colaborador por canal interno do CVG já
   usado para assuntos de RH (e-mail profissional ou mensagem direta). Nunca
   por grupo, planilha compartilhada ou impressão.
3. O token expira pelo prazo do contrato de convite; convite expirado é
   reemitido com `resendAccountInvitation`, que invalida o anterior.
4. Não registrar o token em ticket, log, prompt ou captura de tela.

## Recuperação de conta

1. O participante solicita ao staff; o staff confirma identidade por canal
   interno (presencial ou ramal), nunca pelo mesmo canal do pedido.
2. Staff emite a recuperação (`issueAccountRecovery`) e entrega o link pelo
   canal interno do item anterior. Uso único e expiração curta por contrato.
3. Após o uso, a sessão antiga é revogada pelo próprio fluxo.

## Verificação antes do piloto

Participante sintético convidado e ativado por este procedimento, com o
evento registrado na trilha de auditoria e sem intervenção de engenharia.
