import { createHash } from "node:crypto";

import type {
  InternalVectorPoint,
  VectorPointMetadata,
} from "@cvg/integrations";
import type { IndexableContentRecord } from "@cvg/persistence";

export function vectorPointId(contentId: string, version: number): string {
  const digest = createHash("sha256")
    .update(`${contentId}:${version}`, "utf8")
    .digest("hex");
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20, 32)}`;
}

export function createInternalVectorPoint(
  content: IndexableContentRecord,
  vector: readonly number[],
): InternalVectorPoint {
  return Object.freeze({
    id: vectorPointId(content.contentId, content.version),
    vector: Object.freeze([...vector]),
    knowledgeId: content.contentId,
    sectionId: `${content.contentId}:v${content.version}`,
    scopeId: content.scopeId,
    contentHash: contentHash(content.text),
    status: "APPROVED_FOR_INTERNAL_SEARCH" as const,
  });
}

export function createInternalVectorPointMetadata(
  content: IndexableContentRecord,
  indexVersion: string,
  embeddingModel: string,
): VectorPointMetadata {
  return Object.freeze({
    id: vectorPointId(content.contentId, content.version),
    knowledgeId: content.contentId,
    sectionId: `${content.contentId}:v${content.version}`,
    scopeId: content.scopeId,
    contentHash: contentHash(content.text),
    indexVersion,
    embeddingModel,
  });
}

function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
