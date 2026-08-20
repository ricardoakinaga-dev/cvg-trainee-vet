"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  isAnswerComplete,
  nextActionLabel,
  selectedChoiceIds,
  structuredAnswerValue,
  updateStructuredAnswer,
} from "./participant-model";
import type {
  ActivityItem,
  ActivityProjection,
  AttemptProjection,
  CurriculumRuntimeProjection,
  DigitalCaseRuntimeProjection,
  ExperienceState,
  LearningJourneyProjection,
  PageSaveState,
} from "./participant-model";

type ParticipantActivityViewProps = Readonly<{
  readonly activity: ActivityProjection;
  readonly activityState: ExperienceState;
  readonly attempt: AttemptProjection | null;
  readonly answers: Readonly<Record<string, string>>;
  readonly digitalCase: DigitalCaseRuntimeProjection | null;
  readonly journey: LearningJourneyProjection | null;
  readonly runtime: CurriculumRuntimeProjection | null;
  readonly busy: boolean;
  readonly answeredItemCount: number;
  readonly answerableItems: readonly ActivityItem[];
  readonly progressPercent: number;
  readonly pageSaveState: PageSaveState;
  readonly questionPage: number;
  readonly totalBlocks: number;
  readonly visibleItems: readonly ActivityItem[];
  readonly currentBlockAnswerableItems: readonly ActivityItem[];
  readonly currentBlockAnsweredCount: number;
  readonly blockStartOrdinal: number;
  readonly blockEndOrdinal: number;
  readonly hasNextPage: boolean;
  readonly setAnswers: Dispatch<
    SetStateAction<Readonly<Record<string, string>>>
  >;
  readonly setQuestionPage: Dispatch<SetStateAction<number>>;
  readonly setPageSaveState: Dispatch<SetStateAction<PageSaveState>>;
  readonly handleStartAttempt: () => Promise<void>;
  readonly handleChoiceChange: (
    item: ActivityItem,
    choiceId: string,
    checked: boolean,
  ) => void;
  readonly handleAdvanceDigitalCase: (item: ActivityItem) => Promise<void>;
  readonly handleSaveAnswer: (item: ActivityItem) => Promise<void>;
  readonly handleNextPage: () => Promise<void>;
  readonly saveCurrentBlock: () => Promise<AttemptProjection | null>;
  readonly handleSubmitAttempt: () => Promise<void>;
}>;

type ItemInteractionProps = Readonly<
  Pick<
    ParticipantActivityViewProps,
    | "answers"
    | "busy"
    | "digitalCase"
    | "attempt"
    | "setAnswers"
    | "handleChoiceChange"
    | "handleAdvanceDigitalCase"
    | "handleSaveAnswer"
  >
>;

function AttemptLaunchCard({
  props,
}: Readonly<{ readonly props: ParticipantActivityViewProps }>) {
  return (
    <section className="attempt-launch-card" data-testid="attempt-launch">
      <div>
        <p className="eyebrow">Primeiro passo</p>
        <h2>Pronto para começar?</h2>
        <p>
          Você responderá a atividade em blocos de até três questões. O
          progresso fica salvo a cada avanço.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void props.handleStartAttempt()}
        disabled={props.busy}
      >
        Iniciar tentativa <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}

function ActivityProgressBar({
  props,
}: Readonly<{ readonly props: ParticipantActivityViewProps }>) {
  return (
    <section className="activity-progress" aria-label="Progresso da atividade">
      <div className="progress-copy">
        <div>
          <p className="eyebrow">Progresso da atividade</p>
          <strong>
            {props.answeredItemCount} de {props.answerableItems.length}{" "}
            respondidas
          </strong>
        </div>
        <span className="progress-status">
          {props.pageSaveState === "saving"
            ? "Salvando…"
            : props.pageSaveState === "saved"
              ? "Salvo"
              : props.progressPercent + "%"}
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Progresso da atividade"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={props.progressPercent}
        aria-valuetext={`${props.answeredItemCount} de ${props.answerableItems.length} respondidas`}
      >
        <span style={{ width: props.progressPercent + "%" }} />
      </div>
    </section>
  );
}

function ActivityProgress({
  props,
}: Readonly<{ readonly props: ParticipantActivityViewProps }>) {
  return props.attempt === null ? (
    <AttemptLaunchCard props={props} />
  ) : (
    <ActivityProgressBar props={props} />
  );
}

function QuestionBlockHeading({
  props,
}: Readonly<{ readonly props: ParticipantActivityViewProps }>) {
  return props.attempt === null ? (
    <p className="activity-preview-note">
      Prévia da atividade · inicie a tentativa para liberar as respostas.
    </p>
  ) : (
    <div className="question-block-heading">
      <div>
        <p className="eyebrow">
          Bloco {props.questionPage + 1} de {props.totalBlocks}
        </p>
        <h2 id="question-block-title" tabIndex={-1}>
          Questões {props.blockStartOrdinal}–{props.blockEndOrdinal}
        </h2>
      </div>
      <span>
        {props.currentBlockAnsweredCount} de{" "}
        {props.currentBlockAnswerableItems.length} respondidas
      </span>
    </div>
  );
}

function DigitalCaseNote({
  item,
  digitalCase,
}: Readonly<
  Pick<ItemInteractionProps, "digitalCase"> & { readonly item: ActivityItem }
>) {
  if (item.digitalCaseStage === undefined) return null;
  return (
    <aside className="case-stage-note" aria-label="Caso digital">
      <strong>Caso digital · etapa {item.digitalCaseStage.stage} de 3</strong>
      {digitalCase?.caseId === item.digitalCaseStage.caseId ? (
        <span>
          Estado salvo: etapa {digitalCase.currentStage} · versão{" "}
          {digitalCase.version}.
        </span>
      ) : null}
      <span>Exames seriados disponíveis no cenário:</span>
      <ul>
        {item.digitalCaseStage.examSeries.map((exam) => (
          <li key={exam.id}>
            {exam.modality} · {exam.label} ({exam.observationCount} leituras)
          </li>
        ))}
      </ul>
    </aside>
  );
}

function ChoiceOptions({
  item,
  selected,
  handleChoiceChange,
}: Readonly<{
  readonly item: ActivityItem;
  readonly selected: readonly string[];
  readonly handleChoiceChange: ItemInteractionProps["handleChoiceChange"];
}>) {
  return (
    <>
      {item.choices?.map((choice) => (
        <label className="answer-option" key={choice.id}>
          <input
            type={item.selectionMode === "MULTIPLE" ? "checkbox" : "radio"}
            name={`answer-${item.itemId}`}
            value={choice.id}
            checked={selected.includes(choice.id)}
            onChange={(event) =>
              handleChoiceChange(item, choice.id, event.target.checked)
            }
          />
          <span>
            <strong>{choice.label})</strong> {choice.text}
          </span>
        </label>
      ))}
    </>
  );
}

function ChoiceActions({
  item,
  selected,
  busy,
  digitalCase,
  handleAdvanceDigitalCase,
  handleSaveAnswer,
}: Readonly<
  Pick<
    ItemInteractionProps,
    "busy" | "digitalCase" | "handleAdvanceDigitalCase" | "handleSaveAnswer"
  > & { readonly item: ActivityItem; readonly selected: readonly string[] }
>) {
  return (
    <>
      <button
        type="button"
        className="secondary-button"
        onClick={() => void handleSaveAnswer(item)}
        disabled={busy || selected.length === 0}
      >
        Salvar resposta
      </button>
      {item.digitalCaseStage !== undefined ? (
        <button
          type="button"
          className="secondary-button case-advance-button"
          onClick={() => void handleAdvanceDigitalCase(item)}
          disabled={
            busy ||
            digitalCase === null ||
            digitalCase.caseId !== item.digitalCaseStage.caseId ||
            digitalCase.currentStage !== item.digitalCaseStage.stage ||
            selected.length === 0
          }
        >
          Registrar decisão e liberar próxima etapa
        </button>
      ) : null}
    </>
  );
}

function ChoiceAnswer({
  item,
  answers,
  busy,
  digitalCase,
  handleChoiceChange,
  handleAdvanceDigitalCase,
  handleSaveAnswer,
}: Readonly<
  Pick<
    ItemInteractionProps,
    | "answers"
    | "busy"
    | "digitalCase"
    | "handleChoiceChange"
    | "handleAdvanceDigitalCase"
    | "handleSaveAnswer"
  > & { readonly item: ActivityItem }
>) {
  if (item.responseMode !== "CHOICE" || item.choices === undefined) return null;
  const selected = selectedChoiceIds(item, answers[item.itemId]);
  return (
    <fieldset className="answer-area">
      <legend>Selecione sua resposta</legend>
      <ChoiceOptions
        item={item}
        selected={selected}
        handleChoiceChange={handleChoiceChange}
      />
      <ChoiceActions
        item={item}
        selected={selected}
        busy={busy}
        digitalCase={digitalCase}
        handleAdvanceDigitalCase={handleAdvanceDigitalCase}
        handleSaveAnswer={handleSaveAnswer}
      />
    </fieldset>
  );
}

function TextAnswer({
  item,
  answers,
  busy,
  setAnswers,
  handleSaveAnswer,
}: Readonly<
  Pick<
    ItemInteractionProps,
    "answers" | "busy" | "setAnswers" | "handleSaveAnswer"
  > & { readonly item: ActivityItem }
>) {
  if (item.responseMode !== "TEXT") return null;
  return (
    <div className="answer-area">
      <label htmlFor={`answer-${item.itemId}`}>Resposta — {item.title}</label>
      <textarea
        id={`answer-${item.itemId}`}
        value={answers[item.itemId] ?? ""}
        onChange={(event) =>
          setAnswers((previous) => ({
            ...previous,
            [item.itemId]: event.target.value,
          }))
        }
        maxLength={10_000}
        rows={5}
      />
      <button
        type="button"
        className="secondary-button"
        onClick={() => void handleSaveAnswer(item)}
        disabled={busy || !isAnswerComplete(item, answers[item.itemId])}
      >
        Salvar resposta
      </button>
    </div>
  );
}

type StructuredField = NonNullable<
  ActivityItem["interaction"]
>["fields"][number];

function updateStructuredField(
  item: ActivityItem,
  field: StructuredField,
  setAnswers: ItemInteractionProps["setAnswers"],
  value: string | number | boolean | undefined,
) {
  setAnswers((previous) => ({
    ...previous,
    [item.itemId]: updateStructuredAnswer(
      previous[item.itemId],
      field.id,
      value,
    ),
  }));
}

function StructuredBooleanField({
  item,
  field,
  currentValue,
  setAnswers,
}: Readonly<{
  readonly item: ActivityItem;
  readonly field: StructuredField;
  readonly currentValue: unknown;
  readonly setAnswers: ItemInteractionProps["setAnswers"];
}>) {
  return (
    <input
      id={`answer-${item.itemId}-${field.id}`}
      name={`answer-${item.itemId}`}
      type="checkbox"
      checked={currentValue === true}
      onChange={(event) =>
        updateStructuredField(item, field, setAnswers, event.target.checked)
      }
    />
  );
}

function StructuredScalarField({
  item,
  field,
  currentValue,
  setAnswers,
}: Readonly<{
  readonly item: ActivityItem;
  readonly field: StructuredField;
  readonly currentValue: unknown;
  readonly setAnswers: ItemInteractionProps["setAnswers"];
}>) {
  return (
    <input
      id={`answer-${item.itemId}-${field.id}`}
      name={`answer-${item.itemId}`}
      type={field.valueType === "NUMBER" ? "number" : "text"}
      value={currentValue === undefined ? "" : String(currentValue)}
      min={field.min}
      max={field.max}
      step={field.valueType === "NUMBER" ? "any" : undefined}
      onChange={(event) => {
        const rawValue = event.target.value;
        const parsedNumber = Number(rawValue);
        const nextValue =
          rawValue.trim().length === 0
            ? undefined
            : field.valueType === "NUMBER"
              ? Number.isFinite(parsedNumber)
                ? parsedNumber
                : undefined
              : rawValue;
        updateStructuredField(item, field, setAnswers, nextValue);
      }}
    />
  );
}

function StructuredFieldInput({
  item,
  field,
  answers,
  setAnswers,
}: Readonly<{
  readonly item: ActivityItem;
  readonly field: StructuredField;
  readonly answers: ItemInteractionProps["answers"];
  readonly setAnswers: ItemInteractionProps["setAnswers"];
}>) {
  const currentValue = structuredAnswerValue(answers[item.itemId], field.id);
  return field.valueType === "BOOLEAN" ? (
    <StructuredBooleanField
      item={item}
      field={field}
      currentValue={currentValue}
      setAnswers={setAnswers}
    />
  ) : (
    <StructuredScalarField
      item={item}
      field={field}
      currentValue={currentValue}
      setAnswers={setAnswers}
    />
  );
}

function DoseFormula({ item }: Readonly<{ readonly item: ActivityItem }>) {
  if (item.interaction?.kind !== "DOSE_INFUSION") return null;
  return (
    <p className="structured-formula">
      Dados do exercício: peso {item.interaction.calculationInputs?.weightKg} kg
      · dose/kg {item.interaction.calculationInputs?.doseMgPerKg} mg/kg ·
      concentração {item.interaction.calculationInputs?.concentrationMgPerMl}{" "}
      mg/mL · tempo {item.interaction.calculationInputs?.durationHours} h.
      <br />
      Fórmula: {item.interaction.formulaLabel}
    </p>
  );
}

function StructuredFields({
  item,
  answers,
  setAnswers,
}: Readonly<
  Pick<ItemInteractionProps, "answers" | "setAnswers"> & {
    readonly item: ActivityItem;
  }
>) {
  if (item.interaction === undefined) return null;
  return (
    <>
      {item.interaction.fields.map((field) => (
        <label
          className="structured-field"
          htmlFor={`answer-${item.itemId}-${field.id}`}
          key={field.id}
        >
          <span>
            {field.label}
            {field.unit === undefined ? "" : ` (${field.unit})`}
          </span>
          <StructuredFieldInput
            item={item}
            field={field}
            answers={answers}
            setAnswers={setAnswers}
          />
        </label>
      ))}
    </>
  );
}

function StructuredAnswer({
  item,
  answers,
  busy,
  setAnswers,
  handleSaveAnswer,
}: Readonly<
  Pick<
    ItemInteractionProps,
    "answers" | "busy" | "setAnswers" | "handleSaveAnswer"
  > & { readonly item: ActivityItem }
>) {
  if (
    (item.responseMode !== "STRUCTURED_FIELDS" &&
      item.responseMode !== "DOSE_INFUSION") ||
    item.interaction === undefined
  )
    return null;
  return (
    <div className="answer-area structured-answer-area">
      <DoseFormula item={item} />
      <StructuredFields item={item} answers={answers} setAnswers={setAnswers} />
      <button
        type="button"
        className="secondary-button"
        onClick={() => void handleSaveAnswer(item)}
        disabled={busy || !isAnswerComplete(item, answers[item.itemId])}
      >
        Salvar resposta
      </button>
    </div>
  );
}

function ActivityItemCard({
  item,
  ...props
}: Readonly<ItemInteractionProps & { readonly item: ActivityItem }>) {
  return (
    <article
      className={
        props.attempt === null ? "item-card item-card-preview" : "item-card"
      }
      key={item.itemId}
    >
      <div className="item-meta">
        <span>Item {item.ordinal}</span>
        <span>{item.kind}</span>
      </div>
      <h2>{item.title}</h2>
      <p>{item.text}</p>
      <DigitalCaseNote item={item} digitalCase={props.digitalCase} />
      {props.attempt !== null ? (
        <>
          <ChoiceAnswer item={item} {...props} />
          <TextAnswer item={item} {...props} />
          <StructuredAnswer item={item} {...props} />
        </>
      ) : null}
    </article>
  );
}

function ActivityItems({
  props,
}: Readonly<{ readonly props: ParticipantActivityViewProps }>) {
  return (
    <div className="item-list">
      {props.visibleItems.map((item) => (
        <ActivityItemCard
          key={item.itemId}
          item={item}
          answers={props.answers}
          busy={props.busy}
          digitalCase={props.digitalCase}
          attempt={props.attempt}
          setAnswers={props.setAnswers}
          handleChoiceChange={props.handleChoiceChange}
          handleAdvanceDigitalCase={props.handleAdvanceDigitalCase}
          handleSaveAnswer={props.handleSaveAnswer}
        />
      ))}
    </div>
  );
}

function NavigationPrimaryAction({
  props,
}: Readonly<{ readonly props: ParticipantActivityViewProps }>) {
  return props.hasNextPage ? (
    <button
      type="button"
      onClick={() => void props.handleNextPage()}
      disabled={props.busy}
    >
      {props.pageSaveState === "saving" ? "Salvando…" : "Salvar e avançar"}
      <span aria-hidden="true">→</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => void props.saveCurrentBlock()}
      disabled={props.busy}
    >
      {props.pageSaveState === "saving" ? "Salvando…" : "Salvar bloco"}
    </button>
  );
}

function QuestionNavigation({
  props,
}: Readonly<{ readonly props: ParticipantActivityViewProps }>) {
  if (props.attempt === null) return null;
  return (
    <div className="question-navigation">
      <button
        type="button"
        className="secondary-button navigation-back"
        onClick={() => {
          props.setQuestionPage((previous) => Math.max(0, previous - 1));
          props.setPageSaveState("idle");
        }}
        disabled={props.busy || props.questionPage === 0}
      >
        ← Voltar
      </button>
      <div className="question-navigation-main">
        <NavigationPrimaryAction props={props} />
        {!props.hasNextPage ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => void props.handleSubmitAttempt()}
            disabled={props.busy || props.attempt.status === "SUBMETIDA"}
          >
            Enviar tentativa
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ActivityPrivacyAside({
  journey,
  runtime,
}: Pick<ParticipantActivityViewProps, "journey" | "runtime">) {
  return (
    <aside className="privacy-card" aria-label="Proteção de dados">
      <p className="eyebrow">Superfície do participante</p>
      <h2>Somente o necessário</h2>
      <p>
        Fontes, fotos, PDFs, OCR, prompts e decisões internas ficam fora desta
        tela. A atividade chega como uma projeção autorizada.
      </p>
      {journey !== null ? (
        <div className="journey-card" aria-label="Minha jornada">
          <p className="eyebrow">Minha jornada</p>
          <h2>{nextActionLabel(journey.nextAction)}</h2>
          <p>
            {journey.activities.length} atividade
            {journey.activities.length === 1 ? "" : "s"} no caminho atual.
          </p>
        </div>
      ) : null}
      {runtime !== null ? (
        <div className="runtime-card" aria-label="Estado do módulo">
          <p className="eyebrow">Próxima ação</p>
          <h2>{runtime.nextAction}</h2>
          <p>
            Estado digital: {runtime.status}
            {runtime.scorePercent === undefined
              ? ""
              : ` · ${runtime.scorePercent}%`}
          </p>
          {runtime.remediationCount > 0 ? (
            <p>Objetivos para reforço: {runtime.remediationCount}.</p>
          ) : null}
          {runtime.retentionReviews.length > 0 ? (
            <p>Retenções pendentes: {runtime.retentionReviews.length}.</p>
          ) : null}
          <small>
            Resultado digital não comprova competência prática nem autoriza
            procedimento.
          </small>
        </div>
      ) : null}
    </aside>
  );
}

export function ParticipantActivityView(props: ParticipantActivityViewProps) {
  return (
    <section className="learning-layout" aria-labelledby="activity-title">
      <div className="content-column">
        {props.activityState === "error" ? (
          <p className="feedback warning" role="status">
            Esta é a última versão carregada. A atualização falhou; você pode
            tentar novamente.
          </p>
        ) : null}
        <div className="section-heading">
          <div>
            <p className="eyebrow">Atividade atribuída</p>
            <h1 id="activity-title">{props.activity.title}</h1>
          </div>
          <span className="status-pill">
            {props.attempt?.status ?? "Disponível"}
          </span>
        </div>
        <p className="intro">
          Responda no seu ritmo. O sistema salva apenas a sua projeção de
          aprendizagem e permite retomar depois.
        </p>
        <ActivityProgress props={props} />
        <QuestionBlockHeading props={props} />
        <ActivityItems props={props} />
        <QuestionNavigation props={props} />
      </div>
      <ActivityPrivacyAside journey={props.journey} runtime={props.runtime} />
    </section>
  );
}
