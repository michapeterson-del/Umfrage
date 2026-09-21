import Anthropic from "@anthropic-ai/sdk";
import type { QuestionType, SurveyDraft } from "./types";
import { DEFAULT_THEME } from "./themes";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const SURVEY_TOOL: Anthropic.Tool = {
  name: "create_survey",
  description:
    "Erstellt eine strukturierte Umfrage aus einer Freitext-Beschreibung des Nutzers.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Kurzer, prägnanter Titel der Umfrage.",
      },
      description: {
        type: "string",
        description: "Ein bis zwei Sätze, die den Zweck der Umfrage für die Teilnehmenden erklären. Kann leer sein.",
      },
      questions: {
        type: "array",
        minItems: 1,
        maxItems: 20,
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["single", "multiple", "rating", "text"],
              description:
                "single = eine Antwort aus Optionen (z.B. Ja/Nein), multiple = mehrere Antworten aus Optionen, rating = Bewertungsskala 1-5, text = freie Textantwort.",
            },
            text: { type: "string", description: "Der Fragetext." },
            options: {
              type: "array",
              items: { type: "string" },
              description: "Antwortoptionen, nur für type=single oder type=multiple. 2-8 kurze Optionen.",
            },
            required: {
              type: "boolean",
              description: "Ob die Frage beantwortet werden muss.",
            },
          },
          required: ["type", "text", "required"],
        },
      },
    },
    required: ["title", "questions"],
  },
};

const SYSTEM_PROMPT = `Du bist ein Assistent, der aus einer kurzen Freitext-Beschreibung eine gut strukturierte, anonyme Online-Umfrage erstellt.

Regeln:
- Erkenne implizite und explizite Fragen im Text des Nutzers und wandle sie in klare, präzise Fragen um.
- Wähle für jede Frage den passenden Typ: "single" für Ja/Nein oder Auswahl einer Option, "multiple" wenn mehrere Antworten möglich sein sollen, "rating" für Zufriedenheits-/Bewertungsskalen (1-5), "text" für offene Meinungen/Vorschläge.
- Formuliere kurze, klare Optionen (z.B. "Ja" / "Nein", oder passende Kategorien) für single/multiple Fragen.
- Erstelle zwischen 1 und 10 Fragen, je nachdem wie viel der Nutzer beschrieben hat. Erfinde keine völlig neuen Themen, bleib beim Inhalt des Nutzers.
- Schreibe in der gleichen Sprache wie die Eingabe des Nutzers (meist Deutsch).
- Gib einen kurzen, treffenden Titel und optional eine kurze Beschreibung für die Teilnehmenden.
- Rufe ausschließlich das Werkzeug "create_survey" mit den fertigen Daten auf.`;

function heuristicFallback(input: string): SurveyDraft {
  const lines = input
    .split(/\n|(?<=[.!?])\s+(?=[A-ZÄÖÜ])/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3);

  const questions = (lines.length > 0 ? lines : [input.trim()]).slice(0, 10).map((line) => {
    const lower = line.toLowerCase();
    let type: QuestionType = "text";
    let options: string[] | undefined;

    if (/(skala|1[\s-]*bis[\s-]*5|1[\s-]*-[\s-]*5|bewert)/.test(lower)) {
      type = "rating";
    } else if (
      /(ja\/nein|ja oder nein)/.test(lower) ||
      /^(ist|sind|hast|haben|war|waren|würdest|würden|möchtest|möchten|kannst|könnt|könnten|soll|sollte|sollten|dürfen|darf|willst|wollt|wollen)\b/.test(
        lower
      )
    ) {
      type = "single";
      options = ["Ja", "Nein"];
    }

    const text = line.endsWith("?") ? line : `${line}?`;

    return {
      type,
      text,
      options,
      required: true,
    };
  });

  return {
    title: "Neue Umfrage",
    description: "",
    collectName: false,
    theme: DEFAULT_THEME,
    allowMultipleResponses: false,
    questions,
  };
}

function normalizeDraft(raw: {
  title?: string;
  description?: string;
  questions?: Array<{
    type?: string;
    text?: string;
    options?: string[];
    required?: boolean;
  }>;
}): SurveyDraft {
  const questions = (raw.questions ?? [])
    .filter((q) => q && q.text && q.text.trim().length > 0)
    .map((q) => {
      const type: QuestionType = (["single", "multiple", "rating", "text"] as const).includes(
        q.type as QuestionType
      )
        ? (q.type as QuestionType)
        : "text";
      const needsOptions = type === "single" || type === "multiple";
      let options = needsOptions
        ? (q.options ?? []).map((o) => o.trim()).filter(Boolean)
        : undefined;
      if (needsOptions && (!options || options.length < 2)) {
        options = ["Ja", "Nein"];
      }
      return {
        type,
        text: q.text!.trim(),
        options,
        required: q.required !== false,
      };
    });

  return {
    title: (raw.title ?? "Neue Umfrage").trim() || "Neue Umfrage",
    description: (raw.description ?? "").trim(),
    collectName: false,
    theme: DEFAULT_THEME,
    allowMultipleResponses: false,
    questions: questions.length > 0 ? questions : heuristicFallback(raw.title ?? "").questions,
  };
}

export async function generateSurveyDraft(input: string): Promise<{
  draft: SurveyDraft;
  usedAI: boolean;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { draft: heuristicFallback(input), usedAI: false };
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      tools: [SURVEY_TOOL],
      tool_choice: { type: "tool", name: "create_survey" },
      messages: [
        {
          role: "user",
          content: `Erstelle eine Umfrage aus folgender Beschreibung:\n\n${input}`,
        },
      ],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) {
      return { draft: heuristicFallback(input), usedAI: false };
    }

    const draft = normalizeDraft(
      toolUse.input as Parameters<typeof normalizeDraft>[0]
    );
    return { draft, usedAI: true };
  } catch (err) {
    console.error("AI survey generation failed, using fallback:", err);
    return { draft: heuristicFallback(input), usedAI: false };
  }
}
