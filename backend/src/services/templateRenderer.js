const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

class TemplateRenderError extends Error {
  constructor(message, options) {
    super(message);
    this.name = "TemplateRenderError";
    this.templateId = options.templateId;
    this.language = options.language;
    this.missingVariables = options.missingVariables || [];
    this.cause = options.cause;
    this.statusCode = 400;
  }
}

const compiledTemplates = new Map();

function getTemplatePath(id, language) {
  return path.join(__dirname, "../../templates", language, `${id}.json`);
}

function getTemplateCacheKey(id, language) {
  return `${language}:${id}`;
}

function loadTemplate(id, language) {
  const cacheKey = getTemplateCacheKey(id, language);
  const cachedTemplate = compiledTemplates.get(cacheKey);

  if (cachedTemplate) {
    return cachedTemplate;
  }

  const templatePath = getTemplatePath(id, language);
  let rawTemplate;

  try {
    rawTemplate = fs.readFileSync(templatePath, "utf8");
  } catch (error) {
    throw new TemplateRenderError(`Template not found: ${id} (${language}).`, {
      templateId: id,
      language,
      cause: error,
    });
  }

  const template = JSON.parse(rawTemplate);
  const compiledTemplate = {
    template,
    render: Handlebars.compile(template.text),
  };

  compiledTemplates.set(cacheKey, compiledTemplate);
  return compiledTemplate;
}

function renderTemplate(id, language, vars) {
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

function listTemplates(language) {
  const templateDirectory = path.join(__dirname, "../../templates", language);
  return fs
    .readdirSync(templateDirectory)
    .filter((filename) => filename.endsWith(".json"))
    .map((filename) => filename.replace(/\.json$/, ""));
}

module.exports = {
  TemplateRenderError,
  listTemplates,
  renderTemplate,
};
