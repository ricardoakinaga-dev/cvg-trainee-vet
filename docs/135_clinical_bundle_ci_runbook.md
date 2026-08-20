# Runbook — Bundle clínico privado para o CI (S3-like)

> **Objetivo:** dar aos 3 PDFs clínicos licenciados um destino privado e
> read-only que o runner do GitHub Actions consiga acessar, sem nunca versionar
> os PDFs no Git, publicá-los ou expor credencial em log.
>
> **Status:** runbook de provisionamento. A execução da etapa 3 (upload) e da
> etapa 4 (criação do secret) exige as credenciais do detentor da licença.

## Pré-requisito (não opcional)

Os 3 arquivos devem ter **exatamente** estes nomes e SHA-256 (fonte:
`clinical-sources.json`). Se o SHA divergir, o gate `verify:clinical-sources`
falha de propósito.

| Código | Arquivo | SHA-256 |
|---|---|---|
| `BOOK_ETTINGER_9E` | `Ettinger's Textbook of Veterinary Internal Medicine, 9th Edition (VetBooks.ir).pdf` | `429d0fbf568664c9e01d984cd272bc54195bf8d2aa54ce7caa902f28859875b8` |
| `BOOK_FOSSUM_4E` | `Fossum.Cirurgia de Pequenos Animais_ 4ª Edição-ilovepdf-compressed.pdf` | `df0138e8b5c2b25adce71f8a6549e3f9d6e26e97bdc2a9b559b22bcafd04d2a0` |
| `BOOK_JERICO_CAES_GATOS` | `Tratado de Medicina Interna de - Marcia Marques Jerico, Joao Ped-ilovepdf-compressed-1.pdf` | `ef781de2bd48e940f193926b62b71375871da586e080d8e1dbf7526d16b04628` |

## Etapa 1 — Criar o bucket privado

Escolha um provedor S3-compatível (AWS S3, Wasabi, Cloudflare R2, MinIO).

- **Bloquear acesso público** (`Block all public access`).
- **Versionamento:** pode ficar desligado (imutabilidade de licença vem do SHA).
- **Nome sugerido:** `cvg-clinical-sources` (ajuste ao seu provedor).
- **Pasta/prefixo:** `clinical/` (os 3 PDFs ficam na raiz deste prefixo).

## Etapa 2 — Criar credencial read-only (mínimo privilégio)

Crie uma chave de acesso (Access Key ID + Secret) com política **somente de
leitura** no bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::cvg-clinical-sources",
        "arn:aws:s3:::cvg-clinical-sources/clinical/*"
      ]
    }
  ]
}
```

> Não conceda `PutObject`/`DeleteObject` à credencial usada pelo CI.

## Etapa 3 — Fazer o upload (você, com credenciais de escrita)

Do diretório onde estão os PDFs na sua máquina:

```bash
aws s3 cp "./Ettinger's Textbook..." s3://cvg-clinical-sources/clinical/
aws s3 cp "./Fossum..." s3://cvg-clinical-sources/clinical/
aws s3 cp "./Tratado de Medicina..." s3://cvg-clinical-sources/clinical/
```

Valide os hashes no bucket (opcional, recomendado):

```bash
aws s3api head-object --bucket cvg-clinical-sources --key "clinical/Ettinger's ...pdf"
```

## Etapa 4 — Registrar o secret no GitHub (você)

Em `github.com/<repo>/settings/secrets/actions`, crie estes secrets
(**nunca cole os valores aqui**; use os nomes abaixo):

| Nome do secret | Valor |
|---|---|
| `CLINICAL_SOURCES_S3_ENDPOINT` | URL do endpoint S3 (ex.: `https://s3.amazonaws.com` ou o endpoint R2/Wasabi) |
| `CLINICAL_SOURCES_S3_REGION` | região (ex.: `us-east-1`, ou `auto` para R2) |
| `CLINICAL_SOURCES_S3_BUCKET` | `cvg-clinical-sources` |
| `CLINICAL_SOURCES_S3_ACCESS_KEY` | Access Key ID read-only |
| `CLINICAL_SOURCES_S3_SECRET_KEY` | Secret read-only |
| `CLINICAL_SOURCES_MAX_BYTES` | Limite opcional por arquivo; padrão `2147483648` (2 GiB) |
| `CLINICAL_SOURCES_TIMEOUT_MS` | Timeout opcional por requisição/corpo; padrão `120000` ms |

Se preferir uma variável de configuração pública (não secreta) para o prefixo,
use uma **action variable** `CLINICAL_SOURCES_PREFIX=clinical`.

## Etapa 5 — O que o workflow fará (automatizado, já implementado)

O workflow `quality` já contém o passo `Materialize licensed clinical sources`,
que executa `scripts/fetch-clinical-sources.mjs` (SignV4 puro, sem dependência
nova). O passo:

1. baixa os 3 PDFs do bucket para `/tmp/cvg-clinical-sources` (fora do repo);
2. usa somente endpoint HTTPS sem credenciais/query/fragment/path, não segue
   redirects, limita o corpo por arquivo e aborta requisições/corpos parados;
3. valida cada SHA-256 e falha fechado em qualquer divergência;
4. grava cada arquivo em temp `0600`, verifica o hash e publica por rename
   atômico, removendo qualquer parcial antes de continuar;
5. `pnpm verify` roda com `CVG_CLINICAL_SOURCES_DIRECTORY=/tmp/cvg-clinical-sources`;
6. ao final (`if: always()`), `rm -rf /tmp/cvg-clinical-sources`.

Arquivos alterados/criados:

- `scripts/fetch-clinical-sources.mjs` (download seguro + validação SHA);
- `.github/workflows/quality.yml` (passo de materialização + cleanup).

## Segurança e limites

- Nenhum PDF, hash de credencial ou segredo é gravado em log; o downloader só
  imprime o código sintético da fonte e o diretório de destino.
- O endpoint é validado como HTTPS origin-only, a requisição usa
  `redirect: "error"`, e falhas de rede não expõem URL, resposta ou credencial.
- O corpo é transmitido com limite de bytes, timeout cobrindo headers e body,
  temp file privado e rename atômico; symlink de destino/ancestral é rejeitado.
- O resolver rejeita caminho relativo/dentro do repo e traversal.
- O gate continua exigindo os 3 SHA-256; apontar para o bucket **não** reduz a
  integridade exigida nem substitui a licença.
