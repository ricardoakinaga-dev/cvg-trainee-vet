# Anexo 0014 — Critérios de aceite da fatia vertical do Mês 2

**Projeto:** Sistema CVG de Treinamento Veterinário
**Módulo:** M02 — Emergência e Terapia Intensiva
**Decisão de origem:** D-087, aprovada por MV. Ricardo Akinaga em 2026-08-06
**Estado:** CRITÉRIOS DEFINIDOS ANTES DA AUTORIA; GREEN ESTRUTURAL REGISTRADO NO ANEXO 0017

## 1. Jornada testada

Como médico-veterinário participante, quero percorrer um caso fictício de emergência ao longo de quatro sessões, estudar o material autoral autorizado pelo CVG, justificar decisões e receber feedback seguro, para desenvolver priorização, reavaliação e escalonamento sem usar dados de pacientes reais.

## 2. Entregas obrigatórias

1. um artefato do participante, sem gabaritos nem metadados internos restritos;
2. um artefato restrito do facilitador, com gabaritos, rubricas, erros críticos e fontes;
3. um relatório de pré-voo com resultados estruturais, clínicos, pedagógicos e de privacidade;
4. quatro sessões identificadas como `M02-S1` a `M02-S4`, totalizando 360 minutos;
5. pelo menos dois casos progressivos integralmente fictícios, com contraste entre cão e gato;
6. um quiz de recuperação, questões objetivas e exatamente duas respostas abertas principais;
7. gabarito ou rubrica, respostas aceitas, erros relevantes e feedback para toda atividade avaliável;
8. rastreabilidade interna às três obras e a diretrizes atuais nos pontos atualizáveis;
9. nenhum PDF, trecho extenso, tabela, figura ou imagem das obras no Git ou na camada do participante;
10. estado `AGUARDA_APROVACAO_CLINICA` até a decisão final de Ricardo.

## 3. Matriz de tempo

| Sessão | Limite planejado | Componentes obrigatórios |
|---|---:|---|
| M02-S1 | 60 min | ativação, quiz, abertura do Caso A e decisão inicial |
| M02-S2 | 120 min | pesquisa orientada, progressão do Caso A, questões objetivas e resposta aberta 1 |
| M02-S3 | 120 min | Caso B, deterioração, suporte respiratório/CPR, questões objetivas e resposta aberta 2 |
| M02-S4 | 60 min | integração, debriefing, recuperação espaçada e reflexão |
| **Total** | **360 min** | **6 horas** |

## 4. Casos de teste do conteúdo

| ID | Verificação | Resultado esperado |
|---|---|---|
| FV-M02-01 | estrutura | quatro sessões e 360 minutos |
| FV-M02-02 | casos | dois casos progressivos, um canino e um felino, sem dados reais |
| FV-M02-03 | formatos | quiz, múltipla escolha/ordenação, interpretação e duas respostas abertas |
| FV-M02-04 | avaliabilidade | todos os itens possuem gabarito/rubrica e feedback correspondente |
| FV-M02-05 | segurança | erros críticos estão definidos e acionam remediação, não punição |
| FV-M02-06 | atualidade | fluidoterapia usa AAHA 2024 e CPR usa RECOVER 2024 como camada de atualização |
| FV-M02-07 | direitos | nenhuma reprodução protegida ou PDF rastreado |
| FV-M02-08 | separação | participante não recebe gabaritos nem referências internas restritas |
| FV-M02-09 | correção | as duas respostas abertas têm rubrica aplicável em até cinco dias úteis |
| FV-M02-10 | governança | material permanece bloqueado até aprovação clínica de Ricardo |

## 5. Regra RED → GREEN

Antes da autoria, `FV-M02-01` a `FV-M02-10` devem falhar por ausência dos artefatos. Depois da autoria, somente a estrutura pode ficar automaticamente verde. Correção clínica, clareza e tempo real continuam dependendo de revisão humana e teste com dados sintéticos ou participantes autorizados.
