# 0102 — Bounded Contexts

**Status:** `DERIVADO_DO_PRD`  
**Regra:** contexto é fronteira de responsabilidade; não é necessariamente um microserviço.

## 1. Contextos

| Contexto | Responsabilidade | Não pertence ao contexto |
|---|---|---|
| Identidade e Conta | convite, sessão, estado da conta, perfil permitido e MFA delegado | conteúdo educacional, notas ou senha persistida pela aplicação |
| Acesso e Governança | papéis, escopos, concessões, revogações, aprovação clínica e auditoria | credenciais ou cálculo pedagógico |
| Currículo e Aprendizagem | trilha, módulo, sessão, pré-requisito, atribuição e progresso | decisão de nota ou fonte bibliográfica exposta |
| Conteúdo Editorial | unidade, caso, item, rubrica, versão, validade, revisão e publicação | sessão de usuário ou analytics agregados |
| Avaliação | tentativa, resposta, correção, gabarito/rubrica, remediação e retenção | autorização de papel ou cadastro de fonte em payload participante |
| Evolução e Métricas | projeções individuais e KPIs autorizados | alterar resultado original ou aplicar punição |
| Relatos e Contestação | bug, usabilidade, erro de conteúdo, melhoria, contestação e SLA | anexos, prontuários ou nota alterada fora do fluxo |
| Operação | tarefas, logs, health, alertas, backups e restauração | conteúdo clínico livre ou segredo |
| Registro interno de autoria | fonte, localizador, conflito, corte científico e decisão editorial | qualquer leitura pelo participante |

## 2. Relações

```text
Identidade e Conta
        ↓ identidade autenticada
Acesso e Governança ─────→ todos os contextos protegidos
        ↓ escopo
Currículo e Aprendizagem ←→ Conteúdo Editorial
        ↓ atividade elegível
Avaliação ───────────────→ Evolução e Métricas
        ↓ erro/contestação
Relatos e Contestação ───→ Conteúdo Editorial / Governança
        ↑ operação mínima
Operação

Registro interno de autoria ──→ Conteúdo Editorial (somente construção)
Registro interno de autoria ──X→ projeção participante
```

## 3. Regras de integração entre contextos

1. Identidade fornece `principal_id` e estado da conta; não fornece senha nem token à aplicação de domínio.
2. Governança resolve `role`, escopo e capacidade `CLINICAL_APPROVER`; todo contexto revalida a autorização do lado servidor.
3. Aprendizagem referencia conteúdo por `content_version_id`, nunca pelo catálogo de fonte na projeção participante.
4. Avaliação captura a versão exata do item, rubrica e regra no momento da tentativa.
5. Métricas leem eventos/projeções imutáveis; não reescrevem tentativas, notas ou decisões.
6. Relato de `ERRO_CONTEUDO` pode acionar retirada, mas somente Governança/Conteúdo efetiva a transição autorizada.
7. Registro interno de autoria nunca é incluído em DTOs de participante, exportações, notificações ou analytics visíveis.

## 4. Riscos de acoplamento

- **alto:** avaliação lendo tabelas de conteúdo diretamente; resolver por repositório de versão publicada;
- **alto:** dashboard calculando regras próprias; resolver por queries/projeções versionadas;
- **alto:** frontend inferindo papel ou status; resolver por claims de sessão + resposta autorizada do servidor;
- **alto:** fonte interna misturada ao conteúdo público; resolver por agregados e serializers separados;
- **médio:** tarefas de revisão alterando domínio diretamente; resolver por comando idempotente e auditoria;
- **baixo:** componentes visuais compartilhados; permitido quando não carregarem regra de negócio.

