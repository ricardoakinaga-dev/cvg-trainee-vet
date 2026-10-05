export type ActivityItem = Readonly<{
  readonly itemId: string;
  readonly ordinal: number;
  readonly kind: string;
  readonly title: string;
  readonly text: string;
  readonly responseMode: "TEXT" | "CHOICE" | "NONE";
  readonly choices?: readonly Readonly<{
    readonly id: string;
    readonly label: string;
    readonly text: string;
  }>[];
  readonly selectionMode?: "SINGLE" | "MULTIPLE";
}>;

export function selectedChoiceIds(
  item: ActivityItem,
  value: string | undefined,
): readonly string[] {
  if (value === undefined || value.length === 0) return [];
  if (item.selectionMode !== "MULTIPLE") return [value];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(
          (candidate: unknown): candidate is string =>
            typeof candidate === "string",
        )
      : [];
  } catch {
    return [];
  }
}

type Props = Readonly<{
  items: readonly ActivityItem[];
  answers: Readonly<Record<string, string>>;
  errors?: Readonly<Record<string, string>>;
  editable: boolean;
  disabled: boolean;
  onChoice: (item: ActivityItem, choiceId: string, checked: boolean) => void;
  onText: (itemId: string, response: string) => void;
  onSave: (item: ActivityItem) => Promise<void>;
}>;

export function ParticipantAnswerList({
  items,
  answers,
  errors = {},
  editable,
  disabled,
  onChoice,
  onText,
  onSave,
}: Props) {
  return (
    <div className="item-list">
      {items.map((item) => (
        <article className="item-card" key={item.itemId}>
          <div className="item-meta">
            <span>Item {item.ordinal}</span>
            <span>
              {item.kind === "REFLEXAO" ? "Reflexão digital" : item.kind}
            </span>
          </div>
          <h2>{item.title}</h2>
          <p>{item.text}</p>
          {item.responseMode === "CHOICE" &&
          editable &&
          item.choices !== undefined ? (
            <fieldset
              className="answer-area"
              id={`answer-${item.itemId}`}
              tabIndex={-1}
              aria-invalid={errors[item.itemId] !== undefined || undefined}
              aria-describedby={
                errors[item.itemId] !== undefined
                  ? `answer-error-${item.itemId}`
                  : undefined
              }
            >
              <legend>Selecione sua resposta</legend>
              {item.choices.map((choice) => (
                <label key={choice.id}>
                  <input
                    disabled={disabled}
                    type={
                      item.selectionMode === "MULTIPLE" ? "checkbox" : "radio"
                    }
                    name={`answer-${item.itemId}`}
                    value={choice.id}
                    checked={selectedChoiceIds(
                      item,
                      answers[item.itemId],
                    ).includes(choice.id)}
                    onChange={(event) =>
                      onChoice(item, choice.id, event.target.checked)
                    }
                  />
                  <span>
                    <strong>{choice.label})</strong> {choice.text}
                  </span>
                </label>
              ))}
              <button
                type="button"
                className="secondary-button"
                onClick={() => void onSave(item)}
                disabled={
                  disabled ||
                  selectedChoiceIds(item, answers[item.itemId]).length === 0
                }
              >
                Salvar resposta
              </button>
            </fieldset>
          ) : item.responseMode === "TEXT" && editable ? (
            <div className="answer-area">
              <label htmlFor={`answer-${item.itemId}`}>
                Resposta — {item.title}
              </label>
              <textarea
                id={`answer-${item.itemId}`}
                aria-invalid={errors[item.itemId] !== undefined || undefined}
                aria-describedby={
                  errors[item.itemId] !== undefined
                    ? `answer-error-${item.itemId}`
                    : undefined
                }
                disabled={disabled}
                value={answers[item.itemId] ?? ""}
                onChange={(event) => onText(item.itemId, event.target.value)}
                maxLength={10_000}
                rows={5}
              />
              <button
                type="button"
                className="secondary-button"
                onClick={() => void onSave(item)}
                disabled={disabled}
              >
                Salvar resposta
              </button>
            </div>
          ) : null}
          {errors[item.itemId] !== undefined ? (
            <p
              id={`answer-error-${item.itemId}`}
              className="feedback error"
              role="alert"
            >
              {errors[item.itemId]}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
