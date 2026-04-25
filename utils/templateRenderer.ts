import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

type SupportedLanguage = "en" | "es";

type DialogueTemplate = {
  id: string;
  language: SupportedLanguage;
  variables: string[];
  text: string;
};

type CachedTemplate = {
  template: DialogueTemplate;
  render: Handlebars.TemplateDelegate;
};

export class TemplateRenderError extends Error {
  public readonly templateId: string;
  public readonly language: SupportedLanguage;
  public readonly missingVariables: string[];
  public readonly cause?: unknown;

  constructor(
    message: string,
    options: {
      templateId: string;
      language: SupportedLanguage;
      missingVariables?: string[];
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "TemplateRenderError";
    this.templateId = options.templateId;
    this.language = options.language;
    this.missingVariables = options.missingVariables ?? [];
    this.cause = options.cause;
  }
}

const compiledTemplates = new Map<string, CachedTemplate>();

function getTemplatePath(id: string, language: SupportedLanguage): string {
  const compiledPath = path.join(__dirname, "../../templates", language, `${id}.json`);

  if (fs.existsSync(compiledPath)) {
    return compiledPath;
  }

  return path.join(process.cwd(), "templates", language, `${id}.json`);
}

function getTemplateCacheKey(id: string, language: SupportedLanguage): string {
  return `${language}:${id}`;
}

function loadTemplate(id: string, language: SupportedLanguage): CachedTemplate {
  const cacheKey = getTemplateCacheKey(id, language);
  const cachedTemplate = compiledTemplates.get(cacheKey);

  if (cachedTemplate) {
    return cachedTemplate;
  }

  const templatePath = getTemplatePath(id, language);

  let rawTemplate: string;
  try {
    rawTemplate = fs.readFileSync(templatePath, "utf8");
  } catch (error) {
    throw new TemplateRenderError(`Template not found: ${id} (${language}).`, {
      templateId: id,
      language,
      cause: error,
    });
  }

  const template = JSON.parse(rawTemplate) as DialogueTemplate;
  const compiledTemplate = {
    template,
    render: Handlebars.compile(template.text),
  };

  compiledTemplates.set(cacheKey, compiledTemplate);
  return compiledTemplate;
}

/**
 * Renders a dialogue template with the provided variables.
 */
export function renderTemplate(
  id: string,
  language: SupportedLanguage,
  vars: Record<string, string>,
): string {
  const cachedTemplate = loadTemplate(id, language);
  const missingVariables = cachedTemplate.template.variables.filter((variable) => !(variable in vars));

  if (missingVariables.length > 0) {
    throw new TemplateRenderError(`Missing variables for template: ${missingVariables.join(", ")}.`, {
      templateId: id,
      language,
      missingVariables,
    });
  }

  return cachedTemplate.render(vars);
}

/**
 * Lists the available template IDs for a language.
 */
export function listTemplates(language: SupportedLanguage): string[] {
  const templateDirectory = path.join(__dirname, "../../templates", language);
  return fs
    .readdirSync(templateDirectory)
    .filter((filename) => filename.endsWith(".json"))
    .map((filename) => filename.replace(/\.json$/, ""));
}

// describe("templateRenderer", () => {
//   it("renders a template with all variables", () => {
//     expect(
//       renderTemplate("greeting_morning", "en", {
//         patient_name: "Dad",
//         day_number: "3",
//       }),
//     ).toContain("Dad");
//   });
//
//   it("throws when a declared variable is missing", () => {
//     expect(() => renderTemplate("greeting_morning", "en", { patient_name: "Dad" })).toThrow(
//       TemplateRenderError,
//     );
//   });
//
//   it("throws when the template is unknown", () => {
//     expect(() => renderTemplate("unknown_template", "en", {})).toThrow(TemplateRenderError);
//   });
// });
