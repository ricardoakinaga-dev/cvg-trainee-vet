# Anexo 0011 — Política Mínima Interna de Dados

**Projeto:** Sistema CVG de Treinamento Veterinário
**Data:** 2026-08-05
**Decisão associada:** D-077 — Alternativa 1
**Responsável:** MV. Ricardo Akinaga
**Status:** `APROVADA PARA O MVP INTERNO`
**Bloqueio:** B-05 `FECHADO PARA O MVP INTERNO`

Esta política define o conjunto mínimo de dados necessário para operar o treinamento digital interno. Ela não autoriza prontuários, dados de tutores, casos clínicos reais identificáveis, gravações ou uso disciplinar dos resultados.

## 1. Dados permitidos

| Finalidade | Dados permitidos |
|---|---|
| Identificar e autenticar | nome, identificador interno, login/e-mail profissional e estado da conta |
| Entregar o treinamento | módulos atribuídos, progresso, conclusões e respectivas datas |
| Avaliar aprendizagem | tentativas, itens e respostas aplicados, notas, aprovação, remediação e contestações |
| Proteger e auditar | registros mínimos de login, acesso, alteração de nota, exportação e incidente |

Nenhum campo adicional entra no sistema apenas por ser útil. Nova categoria de dado exige decisão registrada por Ricardo e atualização desta política antes da coleta.

## 2. Usos permitidos

Os dados podem ser usados somente para:

1. liberar acesso e atribuir trilhas;
2. registrar progresso, conclusão, tentativas e notas;
3. fornecer feedback, remediação e contestação;
4. acompanhar a efetividade do treinamento;
5. proteger a conta e auditar alterações relevantes.

Notas e resultados servem ao desenvolvimento profissional. Não podem gerar punição automática, ranking público, decisão disciplinar ou inferência de competência prática e autonomia clínica.

## 3. Dados proibidos no MVP

- prontuários, prescrições, exames ou imagens de atendimentos reais;
- nome, contato, documento, imagem, áudio ou qualquer dado de tutor;
- caso clínico real que identifique ou permita reconhecer paciente, tutor ou colaborador;
- dados pessoais de saúde, biometria ou documentos civis dos participantes;
- gravações de entrevistas, aulas ou reuniões;
- dados reais como massa de teste ou demonstração;
- senhas em texto, chaves, tokens, credenciais ou segredos no banco comum, nos logs ou no Git.

Os casos e as simulações do MVP serão integralmente fictícios. Um futuro uso de caso real anonimizado exige nova decisão e revisão desta política.

## 4. Acesso

| Pessoa | Acesso permitido |
|---|---|
| Participante | seus próprios dados, progresso, tentativas, notas e contestações |
| MV. Ricardo Akinaga | dados necessários para administrar o treinamento, acompanhar participantes e auditar resultados |
| Moderador/mentor autorizado por Ricardo | progresso, lacunas, correções, feedback e remediação somente dos participantes/filas explicitamente atribuídos |
| Administrador autorizado por Ricardo | contas, papéis, trilhas, coorte, operação e auditoria necessários à administração; sem alterar nota fora do fluxo formal |
| Administrador técnico delegado | somente o necessário para suporte, por tempo limitado e com registro de acesso |
| Demais gestores | somente indicadores agregados quando Ricardo autorizar |

Contas compartilhadas são proibidas. Todo acesso deve ser individual, limitado à função e revogado quando deixar de ser necessário.

Ricardo autoriza de forma auditável a concessão ou revogação de administrador e moderador. A capacidade `CLINICAL_APPROVER` permanece exclusiva da identidade de Ricardo e não pode ser concedida pela interface administrativa. Esta atualização de acesso está aprovada por D-092 e não cria gate jurídico separado.

## 5. Retenção e descarte

Os registros permitidos serão mantidos durante o vínculo do participante com o CVG e por mais 2 anos. Depois disso, devem ser eliminados ou anonimizados, salvo preservação necessária para obrigação legal, defesa de direito ou investigação de incidente.

Contas desligadas são bloqueadas imediatamente. A eliminação deve abranger banco principal, exportações e backups conforme o ciclo técnico documentado.

## 6. Segurança mínima da plataforma

Antes do primeiro cadastro real, a implementação deve garantir:

- autenticação individual; senhas armazenadas somente por mecanismo seguro de hash ou provedor de identidade;
- MFA para acessos administrativos, quando suportado pela solução escolhida;
- autorização verificada no servidor antes de consultar ou alterar dados;
- criptografia em trânsito e proteção do armazenamento e dos backups;
- validação de entradas e consultas parametrizadas;
- logs sem senha, token, resposta completa desnecessária ou outro dado proibido;
- segredos em variáveis protegidas ou gestor de segredos, nunca no código ou no Git;
- ambiente de teste sem dados pessoais reais;
- registro auditável de alteração manual de nota;
- mensagens de erro que não exponham detalhes internos.

Esses controles serão transformados em requisitos testáveis na SPEC e na construção.

## 7. Informação e correção

Antes do ensaio, o participante recebe uma comunicação operacional simples sobre os dados mínimos registrados, a finalidade formativa, os acessos permitidos e a retenção adotada pelo projeto.

O participante poderá solicitar a Ricardo:

- acesso aos próprios dados;
- correção de cadastro;
- contestação de nota ou resultado;
- eliminação ou anonimização quando aplicável.

No T2 da M02 não existe gate documental separado. Dúvidas, correções e contestações são tratadas diretamente com Ricardo. Essa simplificação foi aprovada em D-089 e não amplia o conjunto de dados permitido.

## 8. Incidentes

Suspeita de acesso indevido, vazamento ou perda de dados deve ser comunicada imediatamente a Ricardo. O acesso afetado deve ser bloqueado, os registros técnicos preservados e o evento documentado para contenção, correção e avaliação das comunicações legalmente aplicáveis.

## 9. Efeito da decisão D-077

B-05 fica fechado para o MVP interno. Com os controles da seção 6 e a comunicação operacional da seção 7, ficam autorizados somente os dados listados na seção 1.

O diagnóstico e a baseline podem usar dados identificados dentro desse limite. Continuam proibidos gravações, prontuários, dados de tutores e casos reais identificáveis.

### 9.1 Extensão mínima proposta para feedback de produto

D-090 confirmou a necessidade de receber bugs, erros e melhorias. D-094 aprovou, para essa finalidade, somente: protocolo, tipo, categoria, descrição de até 2.000 caracteres, página lógica sem parâmetros, versão da aplicação, autor, datas, responsável, prioridade, estado e resolução. O MVP não recebe anexos.

Não serão capturados automaticamente resposta de avaliação, texto clínico, URL com parâmetros, IP completo, tela, áudio, vídeo, prontuário ou dados de tutor. O formulário proíbe a inserção manual desses dados, bloqueia padrões suspeitos e exige remoção/redação auditada se conteúdo proibido escapar. A contestação de questão ou resultado continua no fluxo já permitido. Esta extensão está incorporada por D-094; não existe novo gate jurídico ou documental separado.

### 9.2 Extensão mínima proposta para acomodação operacional

D-104 permite somente: `accommodation_id`, tipo fechado (`TEMPO`, `FORMATO` ou `PRAZO`), escopo da atividade, início/fim, estado, identificador do autorizador e datas de criação/revogação. Diagnóstico, laudo, condição de saúde, documento comprobatório e justificativa livre permanecem proibidos.

O participante vê a própria acomodação. Ricardo e administrador autorizado veem somente o necessário para conceder, aplicar, revogar e auditar; moderador recebe apenas o efeito operacional no prazo/formato da atividade atribuída, sem motivo ou metadado adicional. Concessão, alteração e revogação são auditadas. A retenção segue o vínculo + 2 anos da seção 5.

Esta extensão foi aprovada em 2026-08-07 com D-104 sobre o commit `f6fefa1`. Sua implementação continua sujeita à SPEC, ao BUILD e aos controles desta política.

## 10. Controle de mudança

Qualquer ampliação de dados, acesso, finalidade ou compartilhamento exige:

1. justificativa de necessidade;
2. aprovação de Ricardo;
3. atualização desta política;
4. commit Git sem dados pessoais, senhas, chaves ou tokens.

## 11. Referência

Esta política aplica ao produto o princípio de usar somente os dados necessários e protegê-los contra acesso indevido, conforme a [Lei nº 13.709/2018 — LGPD, texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), especialmente os arts. 6º, 9º, 18 e 46.

## 12. Evidência do checkpoint

| Campo | Registro |
|---|---|
| Decisão | D-077 — Alternativa 1 |
| Aprovador | MV. Ricardo Akinaga |
| Commit do conteúdo | `889b1f0` — `docs: approve minimal internal data policy` |
| Tag | `gate-d077-minimal-data-policy-2026-08-05` |
| B-05 | `FECHADO PARA O MVP INTERNO` |
