# 0116 — Matriz de Dependências e Versionamento

## 1. Grafo de módulos

```text
packages/domain
      ▲
packages/application ──► packages/contracts
      ▲                         ▲
packages/persistence       apps/web
      ▲                         
apps/api ────────────────► apps/worker
      │                         │
  PostgreSQL                Qdrant / IA adapters
```

Regras de importação:

- `domain` não importa framework, ORM, HTTP, SDK ou variável de ambiente;
- `application` depende de interfaces de domínio e portas, nunca de cliente concreto;
- `contracts` não importa banco e contém schemas/DTOs públicos e internos separados;
- `persistence` implementa portas e não decide regra de negócio;
- `apps/web` importa contratos/UI; não importa persistência, Qdrant, IA ou segredos;
- `apps/api` coordena HTTP, sessão, autorização e casos de uso;
- `apps/worker` consome outbox e portas, sem duplicar regra;
- clientes Qdrant/IA só aparecem em adaptadores de integração.

## 2. Baseline técnica

| Camada | Baseline | Regra de versão |
|---|---|---|
| runtime | Node.js LTS pinado no scaffold | `.nvmrc`/`engines` e lockfile |
| linguagem | TypeScript `strict` | sem `any` implícito; build falha em erro de tipo |
| workspace | pnpm monorepo | lockfile único e dependências por pacote |
| web | React/Next.js | versão fixada no `package.json` e atualizada por PR testado |
| API/worker | Node.js + HTTP adapter | contratos `/api/v1` e schemas versionados |
| banco | PostgreSQL + Drizzle | migração imutável e driver server-side |
| vetor | Qdrant + `@qdrant/js-client-rest` | coleção, índice e dimensão versionados |
| IA | SDK oficial atrás de `AiTextPort`/`EmbeddingPort` | modelo configurável e saída JSON Schema |
| testes | Vitest, Playwright, serviços efêmeros | nenhum serviço externo real no CI |
| qualidade | ESLint, Prettier, typecheck, audit e secret scan | gates obrigatórios por commit/PR |

O número exato de versões é congelado no primeiro commit de B0 e registrado no `BUILD`/lockfile. Não usar `latest`, ranges abertos ou atualização silenciosa.

### Versões congeladas no B0

| Componente | Versão |
|---|---:|
| Node.js | `22.22.x` |
| pnpm | `10.33.0` |
| TypeScript | `5.9.3` |
| Next.js | `16.3.0` |
| React / React DOM | `19.2.0` |
| Drizzle ORM | `0.45.2` |
| postgres.js | `3.4.9` |
| Qdrant REST client | `1.19.0` |
| OpenAI SDK | `5.23.2` |
| Vitest | `4.1.10` |

As versões estão fixadas nos manifests e no `pnpm-lock.yaml`; vulnerabilidades de alta severidade são tratadas antes do próximo gate.

## 3. Dependências internas e externas

**Obrigatórias para o núcleo:** runtime, PostgreSQL, contratos, autenticação/sessão e observabilidade mínima.

**Integradas desde o início, mas degradáveis:** Qdrant e IA. Os adaptadores, configuração, fakes e testes já entram na fundação B0; os fluxos determinísticos não dependem da disponibilidade externa.

**Não previstas:** microserviços de domínio, Kafka, Redis obrigatório, data warehouse, LRS, OCR, armazenamento de PDFs ou processamento de imagens.

Não há seleção de fornecedor como gate. A equipe implementa a baseline documentada e troca somente o adaptador quando houver motivo operacional comprovado.

## 4. Ambientes

| Ambiente | PostgreSQL | Qdrant | IA | Dados |
|---|---|---|---|---|
| local | Docker | Docker | fake por padrão | sintéticos |
| CI | container efêmero | container efêmero | fake determinístico | seed descartável |
| homologação interna | isolado | endpoint protegido | habilitação controlada | casos CVG fictícios |
| produção interna | backup/RLS | endpoint protegido e reconstruível | feature flag + limite | somente dados permitidos |

Segredos entram por ambiente seguro. `.env.example` contém nomes e exemplos vazios, nunca valores reais.

## 5. Procedimento de atualização

1. abrir mudança com motivo, versão anterior/nova e impacto;
2. atualizar lockfile e documentação de integração;
3. executar testes unitários, integração, contrato, E2E e segurança aplicáveis;
4. verificar migração, compatibilidade e rollback;
5. registrar commit, relatório e alteração de dependência;
6. atualizar imagem/container e healthcheck antes do deploy.
