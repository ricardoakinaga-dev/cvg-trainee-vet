"use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  ClinicalReviewQueueItem,
  ClinicalReviewQueuePage,
  InternalAuthoringRecord,
} from "./authoring-model";
import type {
  AuthoringActions,
  ClinicalReviewDecision,
} from "./authoring-actions";
import type { AuthoringPageState } from "./authoring-state";

export type AuthoringViewProps = AuthoringPageState & AuthoringActions;

function AuthoringHeader() {
  return (
    <header className="topbar" aria-label="Identificação da superfície interna">
      <div>
        <p className="eyebrow">CVG · superfície interna</p>
        <span className="brand">Autoria e publicação</span>
      </div>
      <span className="status-pill">Acesso restrito</span>
    </header>
  );
}

type ScopeQueueFormProps = Readonly<{
  readonly scopeId: string;
  readonly busy: boolean;
  readonly setScopeId: Dispatch<SetStateAction<string>>;
  readonly loadQueue: AuthoringActions["loadQueue"];
}>;

function ScopeQueueForm({
  scopeId,
  busy,
  setScopeId,
  loadQueue,
}: ScopeQueueFormProps) {
  return (
    <>
      <label htmlFor="scope-id">Escopo da fila clínica</label>
      <p id="scope-id-help" className="field-help">
        Use o escopo autorizado da revisão clínica para carregar itens pendentes
        sem expor metadados de conteúdo.
      </p>
      <input
        id="scope-id"
        name="scopeId"
        aria-describedby="scope-id-help"
        value={scopeId}
        onChange={(event) => setScopeId(event.target.value)}
      />
      <button
        type="button"
        onClick={() => void loadQueue(scopeId, 1)}
        disabled={busy}
      >
        {busy ? "Carregando…" : "Carregar fila de revisão clínica"}
      </button>
    </>
  );
}

type ContentRecordFormProps = Readonly<{
  readonly contentId: string;
  readonly version: string;
  readonly busy: boolean;
  readonly setContentId: Dispatch<SetStateAction<string>>;
  readonly setVersion: Dispatch<SetStateAction<string>>;
  readonly loadRecord: AuthoringActions["loadRecord"];
}>;

function ContentRecordForm({
  contentId,
  version,
  busy,
  setContentId,
  setVersion,
  loadRecord,
}: ContentRecordFormProps) {
  return (
    <>
      <label htmlFor="content-id">Content ID</label>
      <p id="content-id-help" className="field-help">
        Também é possível abrir um item específico já recebido da equipe
        editorial.
      </p>
      <input
        id="content-id"
        name="contentId"
        aria-describedby="content-id-help"
        value={contentId}
        onChange={(event) => setContentId(event.target.value)}
      />
      <label htmlFor="content-version">Versão</label>
      <input
        id="content-version"
        name="version"
        type="number"
        min="1"
        inputMode="numeric"
        value={version}
        onChange={(event) => setVersion(event.target.value)}
      />
      <button
        type="button"
        onClick={() => void loadRecord(contentId, version)}
        disabled={busy}
      >
        {busy ? "Carregando…" : "Carregar autoria"}
      </button>
    </>
  );
}

function AuthoringAccessForm(
  props: Pick<
    AuthoringViewProps,
    | "scopeId"
    | "contentId"
    | "version"
    | "busy"
    | "setScopeId"
    | "setContentId"
    | "setVersion"
    | "loadQueue"
    | "loadRecord"
  >,
) {
  return (
    <section className="hero-card" aria-labelledby="authoring-title">
      <p className="eyebrow">Registro editorial</p>
      <h1 id="authoring-title">Abrir item autoral</h1>
      <p>
        Esta superfície exige sessão autorizada de autoria. A fonte é verificada
        automaticamente contra o registro imutável; gabaritos, fontes e rubricas
        nunca são projetados para o participante.
      </p>
      <div className="access-form">
        <ScopeQueueForm
          scopeId={props.scopeId}
          busy={props.busy}
          setScopeId={props.setScopeId}
          loadQueue={props.loadQueue}
        />
        <ContentRecordForm
          contentId={props.contentId}
          version={props.version}
          busy={props.busy}
          setContentId={props.setContentId}
          setVersion={props.setVersion}
          loadRecord={props.loadRecord}
        />
      </div>
    </section>
  );
}

function ReviewQueueItem({
  item,
  busy,
  openQueueItem,
}: Readonly<{
  readonly item: ClinicalReviewQueueItem;
  readonly busy: boolean;
  readonly openQueueItem: AuthoringActions["openQueueItem"];
}>) {
  return (
    <div className="review-card" key={`${item.contentId}-${item.version}`}>
      <p className="eyebrow">
        {item.moduleId} · {item.sessionId}
      </p>
      <p>
        Objetivo {item.objectiveId} · {item.contentStatus}
      </p>
      <p>Pré-voo técnico: {item.technicalChecksPassed ? "OK" : "PENDENTE"}</p>
      <button type="button" onClick={() => openQueueItem(item)} disabled={busy}>
        Abrir item
      </button>
    </div>
  );
}

function ReviewQueueItems({
  queue,
  busy,
  openQueueItem,
}: Readonly<{
  readonly queue: ClinicalReviewQueuePage;
  readonly busy: boolean;
  readonly openQueueItem: AuthoringActions["openQueueItem"];
}>) {
  return queue.items.length === 0 ? (
    <p role="status">Nenhum item pendente neste escopo.</p>
  ) : (
    <div className="journey-list">
      {queue.items.map((item) => (
        <ReviewQueueItem
          key={`${item.contentId}-${item.version}`}
          item={item}
          busy={busy}
          openQueueItem={openQueueItem}
        />
      ))}
    </div>
  );
}

function ReviewQueuePagination({
  queue,
  busy,
  scopeId,
  loadQueue,
}: Readonly<{
  readonly queue: ClinicalReviewQueuePage;
  readonly busy: boolean;
  readonly scopeId: string;
  readonly loadQueue: AuthoringActions["loadQueue"];
}>) {
  return queue.page * queue.perPage < queue.total ? (
    <button
      type="button"
      onClick={() => void loadQueue(scopeId, queue.page + 1)}
      disabled={busy}
    >
      Próxima página
    </button>
  ) : null;
}

function ReviewQueueSection({
  queue,
  busy,
  scopeId,
  loadQueue,
  openQueueItem,
}: Readonly<{
  readonly queue: ClinicalReviewQueuePage;
  readonly busy: boolean;
  readonly scopeId: string;
  readonly loadQueue: AuthoringActions["loadQueue"];
  readonly openQueueItem: AuthoringActions["openQueueItem"];
}>) {
  return (
    <section className="hero-card" aria-labelledby="review-queue-title">
      <p className="eyebrow">Itens pendentes · página {queue.page}</p>
      <h1 id="review-queue-title">Fila de revisão clínica</h1>
      <p>
        {queue.total} item(ns) aguardam decisão independente. A fila não contém
        gabarito, fonte, rubrica ou texto clínico.
      </p>
      <ReviewQueueItems
        queue={queue}
        busy={busy}
        openQueueItem={openQueueItem}
      />
      <ReviewQueuePagination
        queue={queue}
        busy={busy}
        scopeId={scopeId}
        loadQueue={loadQueue}
      />
    </section>
  );
}

function AuthoringRecordHeading({
  record,
}: Readonly<{ readonly record: InternalAuthoringRecord }>) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">
          {record.moduleId} · {record.sessionId}
        </p>
        <h1 id="review-title">{record.item.title}</h1>
      </div>
      <span className="status-pill">{record.contentStatus}</span>
    </div>
  );
}

function AuthoringChoices({
  record,
}: Readonly<{ readonly record: InternalAuthoringRecord }>) {
  return record.item.choices === undefined ? null : (
    <div className="review-card">
      <h2>Alternativas</h2>
      {record.item.choices.map((choice) => (
        <p key={choice.id}>
          <strong>{choice.label})</strong> {choice.text}
          {record.item.correctChoiceIds?.includes(choice.id)
            ? " · gabarito"
            : ""}
        </p>
      ))}
    </div>
  );
}

function AuthoringRubric({
  record,
}: Readonly<{ readonly record: InternalAuthoringRecord }>) {
  return record.item.rubric === undefined ? null : (
    <div className="review-card">
      <h2>Rubrica</h2>
      {record.item.rubric.dimensions.map((dimension) => (
        <p key={dimension.id}>
          <strong>{dimension.label}</strong> · {dimension.description} ·{" "}
          {dimension.maxPoints} pontos
        </p>
      ))}
      <p>Nota mínima: {record.item.rubric.passScore}</p>
    </div>
  );
}

function ClinicalDecisionCard({
  record,
  rationale,
  busy,
  setRationale,
  review,
}: Readonly<{
  readonly record: InternalAuthoringRecord;
  readonly rationale: string;
  readonly busy: boolean;
  readonly setRationale: Dispatch<SetStateAction<string>>;
  readonly review: (decision: ClinicalReviewDecision) => Promise<void>;
}>) {
  return (
    <div className="review-card">
      <h2>Decisão clínica</h2>
      <label htmlFor="clinical-rationale">Justificativa clínica</label>
      <textarea
        id="clinical-rationale"
        name="clinical-rationale"
        rows={5}
        value={rationale}
        onChange={(event) => setRationale(event.target.value)}
        placeholder="Registre a justificativa da revisão."
        disabled={busy}
      />
      <div className="review-actions">
        <button
          type="button"
          onClick={() => void review("APROVAR_CLINICAMENTE")}
          disabled={busy || record.contentStatus === "PUBLICADO"}
        >
          Aprovar clinicamente
        </button>
        <button
          type="button"
          onClick={() => void review("SOLICITAR_AJUSTES")}
          disabled={busy || record.contentStatus === "PUBLICADO"}
        >
          Solicitar ajustes
        </button>
      </div>
    </div>
  );
}

function PublicationAction({
  record,
  busy,
  publish,
}: Readonly<{
  readonly record: InternalAuthoringRecord;
  readonly busy: boolean;
  readonly publish: AuthoringActions["publish"];
}>) {
  const disabled =
    busy ||
    record.contentStatus !== "APROVADO_CLINICAMENTE" ||
    !record.preflight.technicalChecksPassed ||
    record.preflight.readyForPublication === false;
  return (
    <div className="review-actions">
      <button type="button" onClick={() => void publish()} disabled={disabled}>
        Publicar conteúdo verificado
      </button>
    </div>
  );
}

function AuthoringRecordMain({
  record,
  rationale,
  busy,
  setRationale,
  review,
  publish,
}: Readonly<{
  readonly record: InternalAuthoringRecord;
  readonly rationale: string;
  readonly busy: boolean;
  readonly setRationale: Dispatch<SetStateAction<string>>;
  readonly review: AuthoringActions["review"];
  readonly publish: AuthoringActions["publish"];
}>) {
  return (
    <div className="review-main">
      <AuthoringRecordHeading record={record} />
      <p className="intro">{record.item.prompt}</p>
      <AuthoringChoices record={record} />
      <AuthoringRubric record={record} />
      <ClinicalDecisionCard
        record={record}
        rationale={rationale}
        busy={busy}
        setRationale={setRationale}
        review={review}
      />
      <PublicationAction record={record} busy={busy} publish={publish} />
    </div>
  );
}

function AuthoringGovernanceAside({
  record,
}: Readonly<{ readonly record: InternalAuthoringRecord }>) {
  return (
    <aside className="privacy-card" aria-label="Governança editorial">
      <p className="eyebrow">Governança</p>
      <h2>Verificação automática</h2>
      <p>
        {record.preflight.technicalChecksPassed ? "Completo" : "Incompleto"}
      </p>
      <p>Objetivo: {record.objectiveId}</p>
      <p>Fonte: {record.preflight.sourceVerification ?? "PENDENTE"}</p>
      <p>Crítico: {record.item.critical ? "sim" : "não"}</p>
      <p>Remediação: {record.item.remediationTargetObjectiveId}</p>
      <h3>Fontes internas</h3>
      {record.item.sourceRefs.map((source) => (
        <p className="journey-item" key={`${source.code}-${source.locator}`}>
          {source.code} · {source.locator}
        </p>
      ))}
    </aside>
  );
}

function AuthoringRecordView({
  record,
  rationale,
  busy,
  setRationale,
  review,
  publish,
}: Readonly<{
  readonly record: InternalAuthoringRecord;
  readonly rationale: string;
  readonly busy: boolean;
  readonly setRationale: Dispatch<SetStateAction<string>>;
  readonly review: AuthoringActions["review"];
  readonly publish: AuthoringActions["publish"];
}>) {
  return (
    <section className="review-layout" aria-labelledby="review-title">
      <AuthoringRecordMain
        record={record}
        rationale={rationale}
        busy={busy}
        setRationale={setRationale}
        review={review}
        publish={publish}
      />
      <AuthoringGovernanceAside record={record} />
    </section>
  );
}

function AuthoringFeedback({
  error,
  notice,
}: Pick<AuthoringViewProps, "error" | "notice">) {
  return (
    <>
      {error !== null ? (
        <p className="feedback error" role="alert">
          {error}
        </p>
      ) : null}
      {notice !== null ? (
        <p className="feedback success" role="status">
          {notice}
        </p>
      ) : null}
    </>
  );
}

function AuthoringEntryView(props: AuthoringViewProps) {
  return (
    <>
      <AuthoringAccessForm {...props} />
      {props.queue !== null ? (
        <ReviewQueueSection {...props} queue={props.queue} />
      ) : null}
    </>
  );
}

export function AuthoringView(props: AuthoringViewProps) {
  return (
    <main
      className="shell"
      id="main-content"
      tabIndex={-1}
      aria-busy={props.busy}
    >
      <AuthoringHeader />
      {props.record === null ? (
        <AuthoringEntryView {...props} />
      ) : (
        <AuthoringRecordView {...props} record={props.record} />
      )}
      <AuthoringFeedback error={props.error} notice={props.notice} />
    </main>
  );
}
