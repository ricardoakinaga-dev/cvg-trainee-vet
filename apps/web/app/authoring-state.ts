"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  ClinicalReviewQueuePage,
  InternalAuthoringRecord,
} from "./authoring-model";

export type AuthoringPageState = Readonly<{
  readonly record: InternalAuthoringRecord | null;
  readonly contentId: string;
  readonly version: string;
  readonly scopeId: string;
  readonly queue: ClinicalReviewQueuePage | null;
  readonly rationale: string;
  readonly busy: boolean;
  readonly error: string | null;
  readonly notice: string | null;
  readonly setRecord: Dispatch<SetStateAction<InternalAuthoringRecord | null>>;
  readonly setContentId: Dispatch<SetStateAction<string>>;
  readonly setVersion: Dispatch<SetStateAction<string>>;
  readonly setScopeId: Dispatch<SetStateAction<string>>;
  readonly setQueue: Dispatch<SetStateAction<ClinicalReviewQueuePage | null>>;
  readonly setRationale: Dispatch<SetStateAction<string>>;
  readonly setBusy: Dispatch<SetStateAction<boolean>>;
  readonly setError: Dispatch<SetStateAction<string | null>>;
  readonly setNotice: Dispatch<SetStateAction<string | null>>;
}>;

export function useAuthoringPageState(): AuthoringPageState {
  const [record, setRecord] = useState<InternalAuthoringRecord | null>(null);
  const [contentId, setContentId] = useState("");
  const [version, setVersion] = useState("1");
  const [scopeId, setScopeId] = useState("");
  const [queue, setQueue] = useState<ClinicalReviewQueuePage | null>(null);
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  return {
    record,
    contentId,
    version,
    scopeId,
    queue,
    rationale,
    busy,
    error,
    notice,
    setRecord,
    setContentId,
    setVersion,
    setScopeId,
    setQueue,
    setRationale,
    setBusy,
    setError,
    setNotice,
  };
}
