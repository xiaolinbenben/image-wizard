import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TEMPLATE_DIR = path.join(ROOT, "src", "data", "templates");

const TOP_LEVEL_REQUIRED = ["id", "title", "description", "base_prompt", "questions"];
const TOP_LEVEL_ALLOWED = new Set([
  ...TOP_LEVEL_REQUIRED,
  "output_constraint",
]);

const QUESTION_REQUIRED = ["id", "question", "question_kind", "type", "options"];
const QUESTION_ALLOWED = new Set([
  ...QUESTION_REQUIRED,
  "description",
  "condition",
  "custom_input_placeholder",
]);

const OPTION_REQUIRED = ["id", "label"];
const OPTION_ALLOWED = new Set([
  ...OPTION_REQUIRED,
  "description",
  "tags",
  "preview",
  "backend_model_id",
  "billing_variant_key",
  "billing_factor",
]);

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateAllowedKeys(target, allowedSet, location, errors) {
  for (const key of Object.keys(target)) {
    if (!allowedSet.has(key)) {
      errors.push(`${location} contains unsupported key: ${key}`);
    }
  }
}

function validateRequiredKeys(target, requiredKeys, location, errors) {
  for (const key of requiredKeys) {
    if (!(key in target)) {
      errors.push(`${location} missing required key: ${key}`);
    }
  }
}

function validateTemplateShape(template, file, errors) {
  if (!isObject(template)) {
    errors.push(`${file} must be an object`);
    return;
  }

  validateRequiredKeys(template, TOP_LEVEL_REQUIRED, file, errors);
  validateAllowedKeys(template, TOP_LEVEL_ALLOWED, file, errors);

  if (!Array.isArray(template.questions) || template.questions.length === 0) {
    errors.push(`${file}.questions must be a non-empty array`);
    return;
  }

  const questionIds = new Set();
  const questionIndexById = new Map();

  template.questions.forEach((question, index) => {
    const location = `${file}.questions[${index}]`;

    if (!isObject(question)) {
      errors.push(`${location} must be an object`);
      return;
    }

    validateRequiredKeys(question, QUESTION_REQUIRED, location, errors);
    validateAllowedKeys(question, QUESTION_ALLOWED, location, errors);

    if (!["prompt_input", "generation_param"].includes(question.question_kind)) {
      errors.push(`${location}.question_kind must be prompt_input | generation_param`);
    }

    if (!["single", "multi"].includes(question.type)) {
      errors.push(`${location}.type must be single | multi`);
    }

    if (!Array.isArray(question.options) || question.options.length === 0) {
      errors.push(`${location}.options must be a non-empty array`);
    }

    if (typeof question.id !== "string" || question.id.trim().length === 0) {
      errors.push(`${location}.id must be a non-empty string`);
    } else {
      if (questionIds.has(question.id)) {
        errors.push(`${file} duplicate question id: ${question.id}`);
      }
      questionIds.add(question.id);
      questionIndexById.set(question.id, index);
    }

    const optionIds = new Set();
    if (Array.isArray(question.options)) {
      question.options.forEach((option, optionIndex) => {
        const optionLocation = `${location}.options[${optionIndex}]`;

        if (!isObject(option)) {
          errors.push(`${optionLocation} must be an object`);
          return;
        }

        validateRequiredKeys(option, OPTION_REQUIRED, optionLocation, errors);
        validateAllowedKeys(option, OPTION_ALLOWED, optionLocation, errors);

        if (typeof option.id !== "string" || option.id.trim().length === 0) {
          errors.push(`${optionLocation}.id must be a non-empty string`);
        } else if (optionIds.has(option.id)) {
          errors.push(`${location} duplicate option id: ${option.id}`);
        } else {
          optionIds.add(option.id);
        }

        if ("billing_factor" in option) {
          const factor = Number(option.billing_factor);
          if (!Number.isFinite(factor) || factor <= 0) {
            errors.push(`${optionLocation}.billing_factor must be > 0`);
          }
        }
      });
    }

    if ("condition" in question) {
      if (!isObject(question.condition)) {
        errors.push(`${location}.condition must be an object`);
      } else {
        const conditionKeys = Object.keys(question.condition);
        for (const key of conditionKeys) {
          if (!["question_id", "equals_option_id"].includes(key)) {
            errors.push(`${location}.condition contains unsupported key: ${key}`);
          }
        }
        if (typeof question.condition.question_id !== "string" || !question.condition.question_id) {
          errors.push(`${location}.condition.question_id must be a non-empty string`);
        }
        if (
          typeof question.condition.equals_option_id !== "string" ||
          !question.condition.equals_option_id
        ) {
          errors.push(`${location}.condition.equals_option_id must be a non-empty string`);
        }
      }
    }
  });

  // Condition semantic checks
  const questionById = new Map(template.questions.map((q) => [q.id, q]));
  for (const [index, question] of template.questions.entries()) {
    if (!question.condition) {
      continue;
    }
    const location = `${file}.questions[${index}]`;
    const parent = questionById.get(question.condition.question_id);
    if (!parent) {
      errors.push(`${location}.condition.question_id not found: ${question.condition.question_id}`);
      continue;
    }

    const parentIndex = questionIndexById.get(parent.id);
    if (!Number.isInteger(parentIndex) || parentIndex >= index) {
      errors.push(`${location}.condition parent must appear before current question`);
    }

    if (parent.type !== "single") {
      errors.push(`${location}.condition parent must be single type`);
    }

    const optionExists = Array.isArray(parent.options)
      ? parent.options.some((option) => option.id === question.condition.equals_option_id)
      : false;
    if (!optionExists) {
      errors.push(
        `${location}.condition.equals_option_id not found on parent option: ${question.condition.equals_option_id}`,
      );
    }
  }

  // Detect cyclic condition chain
  const visiting = new Set();
  const visited = new Set();
  const dfs = (questionId) => {
    if (visited.has(questionId)) {
      return;
    }
    if (visiting.has(questionId)) {
      errors.push(`${file} cyclic condition chain detected at question: ${questionId}`);
      return;
    }
    visiting.add(questionId);
    const current = questionById.get(questionId);
    const parentId = current?.condition?.question_id;
    if (parentId) {
      dfs(parentId);
    }
    visiting.delete(questionId);
    visited.add(questionId);
  };
  template.questions.forEach((question) => dfs(question.id));
}

function main() {
  const files = fs
    .readdirSync(TEMPLATE_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort();

  const errors = [];
  for (const file of files) {
    const fullPath = path.join(TEMPLATE_DIR, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      errors.push(`${file} invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    validateTemplateShape(parsed, file, errors);
  }

  if (errors.length > 0) {
    console.error(`Template validation failed with ${errors.length} issue(s):`);
    for (const item of errors) {
      console.error(`- ${item}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Template validation passed (${files.length} files).`);
}

main();
