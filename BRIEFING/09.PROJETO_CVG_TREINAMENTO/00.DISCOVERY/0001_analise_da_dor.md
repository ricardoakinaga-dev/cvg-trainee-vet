# 0001 — Análise da Dor

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Status:** preenchido com fatos, hipóteses e lacunas explícitas

## Quem sofre a dor

### Usuário primário

Médicos-veterinários colaboradores do CVG que precisam manter e ampliar o conhecimento profissional de forma contínua.

### Impactados operacionais

- Coordenação e direção clínica, que precisam conhecer lacunas e evolução;
- Mentores, preceptores e especialistas, que precisam orientar reforços;
- Responsável técnico, que precisa apoiar qualidade e segurança;
- Gestão de pessoas, quando autorizada a acompanhar conclusão e desenvolvimento;
- Equipe assistencial, afetada pela consistência das condutas;
- Pacientes e tutores, impactados indiretamente pela qualidade do atendimento.

## Quando ocorre

**FATO INFORMADO:** A necessidade é contínua e acompanha a permanência e o desenvolvimento do colaborador no CVG.

Momentos em que a dor pode se manifestar:

- Entrada de um novo veterinário;
- Mudança de função ou área;
- Introdução ou atualização de protocolo;
- Identificação de lacuna em avaliação;
- Dificuldade recorrente em determinado tema;
- Necessidade de reciclagem;
- Progressão do nível básico para intermediário ou avançado.

**PENDENTE:** confirmar quais desses eventos ocorrem hoje e com qual frequência.

## Frequência

- Necessidade de aprendizagem: contínua;
- Frequência de treinamentos atuais: não informada;
- Frequência de avaliações atuais: não informada;
- Frequência de falhas, dúvidas ou variações de conduta relacionadas a conhecimento: não medida;
- Frequência recomendada de medição: será definida no PRD após baseline.

## Etapa diagnóstica anterior ao treinamento

**FATO INFORMADO PELO PATROCINADOR:** antes de iniciar o processo de treinamento, cada médico-veterinário deverá realizar uma avaliação diagnóstica de conhecimento.

Essa etapa deverá:

- Estabelecer a linha de base individual antes de qualquer intervenção educacional;
- Medir o conhecimento por tema e competência, evitando depender apenas de uma nota geral;
- Identificar conhecimentos já consolidados e lacunas prioritárias;
- Apoiar a atribuição de uma trilha inicial personalizada;
- Orientar a ordem, a profundidade e os reforços do treinamento;
- Permitir comparações posteriores com avaliações equivalentes;
- Fornecer um parâmetro objetivo para acompanhar ganho, domínio e retenção ao longo do tempo.

Fluxo conceitual confirmado:

```text
avaliação diagnóstica inicial
→ perfil individual de conhecimentos e lacunas
→ atribuição da trilha personalizada
→ início do treinamento
→ avaliações posteriores equivalentes
→ mensuração da evolução
```

O diagnóstico deverá ter finalidade educacional e de nivelamento, não caráter punitivo. O resultado teórico não comprova competência clínica prática e não deverá, isoladamente, autorizar procedimentos, determinar autonomia clínica ou fundamentar decisão trabalhista.

A personalização não deverá dispensar automaticamente conteúdos institucionais obrigatórios, temas críticos de segurança ou atualizações de protocolo. As regras de dispensa, repetição do diagnóstico, equivalência das avaliações, acesso aos resultados e proteção dos dados ainda dependerão de aprovação humana no PRD.

## Impacto

### Tempo

**HIPÓTESE:** busca dispersa por materiais, repetição de explicações, dificuldade para saber o que estudar e esforço manual de acompanhamento.

**EVIDÊNCIA QUANTITATIVA:** não disponível.

### Dinheiro

**HIPÓTESE:** custo de treinamentos sem mensuração de resultado, retrabalho, alocação inadequada de capacitação e possíveis impactos de inconsistência clínica.

**EVIDÊNCIA QUANTITATIVA:** não disponível.

### Erro e segurança

**HIPÓTESE DE ALTO IMPACTO:** lacunas de conhecimento podem contribuir para decisões inconsistentes. Aprovação teórica, entretanto, não comprova competência clínica nem permite atribuir causalidade direta a um desfecho.

**EVIDÊNCIA QUANTITATIVA:** não disponível.

### Experiência do colaborador

**HIPÓTESE:** ausência de uma trilha clara pode gerar insegurança sobre expectativas, progressão e prioridades de estudo.

**EVIDÊNCIA QUANTITATIVA:** não disponível.

### Gestão

**FATO DO BRIEFING:** a avaliação diagnóstica anterior ao treinamento foi definida como requisito, mas ainda não há critérios aprovados para construir a linha de base, personalizar a trilha e comparar evolução individual, retenção, domínio por competência e necessidade de remediação.

## Consequência de não resolver

- Permanecer sem um padrão documentado de desenvolvimento teórico;
- Dificuldade de demonstrar evolução ao longo do tempo;
- Foco excessivo em conclusão ou presença, sem verificar retenção;
- Treinamentos desconectados das lacunas de cada colaborador;
- Dificuldade para priorizar investimento educacional;
- Risco de conteúdo desatualizado ou sem revisão;
- Dificuldade de auditar o que foi ensinado, avaliado e aprovado.

## Evidências observadas

### Disponíveis

1. Declaração formal do solicitante sobre a necessidade do sistema;
2. Requisitos iniciais: básico ao avançado, trilhas, quizzes, provas e métricas;
3. Definição do patrocinador de que cada veterinário deverá realizar avaliação diagnóstica antes do treinamento, para personalização e estabelecimento da linha de base;
4. Existência do tratado brasileiro local indicado como fonte curricular principal;
5. Existência do *Ettinger’s Textbook of Veterinary Internal Medicine*, 9ª edição, publicado em 2024, indicado como fonte atualizada;
6. Existência do documento anterior `sistema_treinamento_veterinarios_cvg.md`, com diretrizes gerais de treinamento contínuo.
7. Confirmação de MV. Ricardo Akinaga, responsável por todas as áreas do MVP, de que o aprendizado atual é informal e não possui trilha, avaliação ou registro centralizado (D-078).
8. Público de aproximadamente 10 veterinários, todos participantes da primeira aplicação (D-079).

### Ausentes

- Linha de base do diagnóstico curto (B-07);
- Levantamento de lacunas clínicas;
- Protocolos internos relevantes para cada módulo.

## Respostas às perguntas obrigatórias

### Isso acontece sempre ou pontualmente?

A necessidade de atualização é permanente. A frequência da dor operacional ainda não foi medida.

### Isso impacta a operação ou somente a percepção?

Há potencial de impacto operacional, educacional e de segurança, mas a extensão real precisa ser validada com dados.

### Isso gera prejuízo real?

É plausível, mas não há evidência financeira ou assistencial suficiente para quantificar prejuízo neste momento.

### Qual é o custo real?

Não informado e não mensurado. Deve ser levantado no Discovery por meio de horas gastas, custo de treinamento, retrabalho e indicadores selecionados.

### Quem é mais impactado?

Primariamente os veterinários colaboradores; secundariamente coordenação clínica, mentores, gestão, equipe assistencial, pacientes e tutores.

## Critério de validação da dor

A dor está validada pela descrição direta do processo atual em D-078: aprendizado informal, sem trilha, avaliação ou registro centralizado. B-01 está fechado. O diagnóstico curto B-07 medirá o ponto de partida educacional, sem exigir entrevistas ou inventário.
