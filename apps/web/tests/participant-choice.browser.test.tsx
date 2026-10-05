import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";

import {
  ParticipantAnswerList,
  type ActivityItem,
} from "../app/participant-answer-list";
import "../app/globals.css";

afterEach(() => {
  window.sessionStorage.clear();
});

function ChoiceHarness({
  selectionMode,
}: {
  selectionMode: "SINGLE" | "MULTIPLE";
}) {
  const [answer, setAnswer] = useState<string>();
  const item: ActivityItem = {
    itemId: "11111111-1111-4111-8111-111111111111",
    ordinal: 1,
    kind: "QUIZ",
    title: "Escolhas sintéticas",
    text: "Selecione uma alternativa sintética.",
    responseMode: "CHOICE",
    selectionMode,
    choices: [
      {
        id: "A",
        label: "A",
        text: "Alternativa sintética com texto longo para verificar a disposição em telas estreitas.",
      },
      { id: "B", label: "B", text: "Outra alternativa sintética." },
    ],
  };
  return (
    <main className="page-shell">
      <ParticipantAnswerList
        items={[item]}
        answers={answer === undefined ? {} : { [item.itemId]: answer }}
        editable
        disabled={false}
        onChoice={(_item, id) =>
          setAnswer(selectionMode === "SINGLE" ? id : JSON.stringify([id]))
        }
        onText={() => undefined}
        onSave={async () => undefined}
      />
    </main>
  );
}

for (const selectionMode of ["SINGLE", "MULTIPLE"] as const) {
  it.each([1440, 768, 390])(
    `lays out ${selectionMode} participant choices beside their text at %i`,
    async (width) => {
      await page.viewport(width, 1000);
      const ui = await render(<ChoiceHarness selectionMode={selectionMode} />);
      const choices = [
        ...document.querySelectorAll<HTMLLabelElement>(
          ".answer-area label:has(input)",
        ),
      ];
      expect(choices).toHaveLength(2);
      expect(window.innerWidth).toBe(width);
      for (const choice of choices) {
        const card = choice.getBoundingClientRect();
        const input = choice.querySelector("input")!;
        const control = input.getBoundingClientRect();
        const text = choice.querySelector("span")!.getBoundingClientRect();
        // Match the compact 1.1rem selection design, keeping the label clickable.
        const rootFontSize = Number.parseFloat(
          getComputedStyle(document.documentElement).fontSize,
        );
        expect(control.width).toBeCloseTo(1.1 * rootFontSize, 0);
        expect(control.height).toBeCloseTo(1.1 * rootFontSize, 0);
        expect(control.right).toBeLessThan(text.left);
        expect(text.right).toBeLessThanOrEqual(card.right + 1);
        expect(text.bottom).toBeLessThanOrEqual(card.bottom + 1);
        expect(card.right).toBeLessThanOrEqual(width);
        expect(card.height).toBeGreaterThanOrEqual(2.9 * rootFontSize - 1);
      }
      await ui
        .getByText(
          "Alternativa sintética com texto longo para verificar a disposição em telas estreitas.",
        )
        .click();
      const selected = choices[0]!.querySelector("input")!;
      expect(selected.checked).toBe(true);
      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
      expect(document.activeElement).toBe(selected);
      expect(getComputedStyle(selected).outlineStyle).not.toBe("none");
      await expect
        .element(ui.getByRole("button", { name: "Salvar resposta" }))
        .toBeEnabled();
    },
  );
}
