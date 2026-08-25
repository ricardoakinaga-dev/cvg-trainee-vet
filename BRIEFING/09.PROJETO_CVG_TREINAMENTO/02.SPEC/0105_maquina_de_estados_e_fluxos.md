# 0105 — Máquina de Estados e Fluxos

## 1. Estados de conteúdo editorial

```text
RASCUNHO
→ AUTOVERIFICADO
→ EM_REVISAO_CLINICA
→ AJUSTES_SOLICITADOS ↺
→ APROVADO_CLINICAMENTE
→ PROJECAO_VERIFICADA
→ AUTORIZADO_PARA_PUBLICACAO
→ PUBLICADO
→ RETIRADO ou VENCIDO
```

Regras: só Ricardo efetiva aprovação clínica/publicação no MVP; fonte/conflito/protocolo ausente bloqueia; retirada emergencial bloqueia exposição nova; publicação não modifica versão anterior.

## 2. Estados de atribuição e progresso

```text
NAO_ATRIBUIDO
→ ATRIBUIDO
→ DISPONIVEL
→ EM_ANDAMENTO
→ CONCLUIDO
→ EM_REFORCO
→ CONCLUIDO_COM_RETENCAO_PENDENTE
```

`PAUSADO` é uma condição operacional aplicável a `ATRIBUIDO`, `DISPONIVEL` ou `EM_ANDAMENTO`, por afastamento, janela ou interrupção. `BLOQUEADO` é derivado de pré-requisito, conteúdo retirado ou objetivo em remediação; não é punição.

## 3. Estados de tentativa e resposta

```text
CRIADA → EM_ANDAMENTO → SALVA → SUBMETIDA
SUBMETIDA → CORRIGIDA_AUTOMATICAMENTE
SUBMETIDA → AGUARDA_CORRECAO_HUMANA → CORRIGIDA_HUMANAMENTE
SUBMETIDA → ANULADA (somente decisão versionada)
```

Transições proibidas: editar resposta após submissão; corrigir sem versão de regra; duplicar submissão com a mesma chave de idempotência; expor gabarito antes do feedback autorizado.

## 4. Estados de resultado e domínio

```text
RESULTADO_EM_PROCESSAMENTO
→ RESULTADO_DISPONIVEL
→ RESULTADO_EM_REVISÃO
→ RESULTADO_CORRIGIDO
→ RESULTADO_ANULADO
```

Progresso, avaliação e domínio são estados separados. Um resultado digital nunca cria competência prática, autorização de procedimento ou autonomia clínica.

## 5. Estados de ticket

```text
NOVO → TRIADO → EM_TRATAMENTO → AGUARDA_USUARIO → RESOLVIDO
  ├→ DUPLICADO
  ├→ NAO_REPRODUZIDO
  └→ NAO_PLANEJADO
```

`ERRO_CONTEUDO` crítico pode emitir comando de retirada, mas não publica nem altera gabarito automaticamente.

Prioridade e responsabilidade são metadata ortogonal ao autômato de estados.
Uma alteração interna de triagem não abre uma transição de ticket: conserva o
estado, incrementa a versão e registra `METADATA_ALTERADO` com prioridade e
responsabilidade anterior/nova. A ação `ASSUMIR` usa o principal autenticado;
`LIBERAR` remove o responsável; nenhuma dessas ações responde ao participante,
cria SLA, envia notificação ou decide risco clínico.

## 6. Estados de autorização

```text
SOLICITADA → APROVADA → CONCEDIDA → SUSPENSA → REVOGADA
```

Concessão e revogação são auditadas. `CLINICAL_APPROVER` não pode ser concedida por administrador comum e só existe para a identidade aprovada no bootstrap controlado.

## 7. Falhas e recuperação

- perda de conexão antes de confirmação: manter rascunho local não sensível e retomar último estado confirmado;
- timeout depois de comando mutável: consultar chave de idempotência antes de repetir;
- falha de correção: manter tentativa submetida, marcar pendência operacional e não recalcular parcialmente;
- falha de job: retry limitado com backoff, registro de tentativa e estado de erro para reprocessamento seguro;
- conteúdo vencido/retirado: impedir início, preservar histórico e mostrar próxima ação neutra;
- escopo ausente: negar por padrão e registrar código de autorização, sem revelar dados de outro usuário.
