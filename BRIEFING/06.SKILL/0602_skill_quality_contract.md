# 0602 — Contrato de Qualidade das Skills

## Frontmatter

```yaml
---
name: nome-da-skill
description: quando usar e quando não usar, com escopo objetivo
---
```

## Conteúdo mínimo

1. `# CONTEXTO` — fase e responsabilidade;
2. `# PRÉ-CONDIÇÕES` — arquivos/gates necessários;
3. `# EXECUÇÃO` — passos imperativos e artefatos;
4. `# ESTADO` — como atualizar runtime/log/backlog;
5. `# LOOP` — validar, decidir, continuar/bloquear;
6. `# SAÍDA` — resultado, evidências, próximo passo e status.

## Segurança e escopo

- não incluir segredos, tokens ou dados de usuário em skill;
- não usar IA para decidir aprovação clínica, nota, papel ou publicação;
- preservar fronteira de rastreabilidade interna: participante nunca recebe fonte/foto/PDF/metadado;
- qualquer script deve ser determinístico, revisável e coberto por teste;
- skill deve preferir mudanças pequenas e atualizar documentação viva.

## Invocação

`allow_implicit_invocation: true` para Discovery, PRD, SPEC, BUILD e AUDIT; `false` para runtime-controller. Se duas skills forem aplicáveis, escolher a mínima que cobre a etapa e declarar a ordem.

