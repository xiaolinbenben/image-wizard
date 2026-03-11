import type { Template, TemplateQuestion } from "./types";

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[image-wizard] template validation failed: ${message}`);
  }
}

function validateQuestionOptions(templateId: string, question: TemplateQuestion): void {
  invariant(question.options.length > 0, `${templateId}.${question.id} has no options`);

  const optionIds = new Set<string>();
  for (const option of question.options) {
    invariant(!optionIds.has(option.id), `${templateId}.${question.id} has duplicate option id: ${option.id}`);
    optionIds.add(option.id);
  }
}

function validateQuestionConditions(templateId: string, questions: TemplateQuestion[]): void {
  const questionById = new Map<string, TemplateQuestion>();
  const questionIndexById = new Map<string, number>();

  questions.forEach((question, index) => {
    questionById.set(question.id, question);
    questionIndexById.set(question.id, index);
  });

  for (const question of questions) {
    if (!question.condition) {
      continue;
    }

    const parent = questionById.get(question.condition.question_id);
    invariant(parent, `${templateId}.${question.id} condition parent not found: ${question.condition.question_id}`);

    const parentIndex = questionIndexById.get(parent.id) ?? -1;
    const currentIndex = questionIndexById.get(question.id) ?? -1;
    invariant(
      parentIndex >= 0 && parentIndex < currentIndex,
      `${templateId}.${question.id} condition parent must appear before current question`,
    );

    invariant(
      parent.type === "single",
      `${templateId}.${question.id} condition parent must be single type (got ${parent.type})`,
    );

    const parentOptionMatched = parent.options.some(
      (option) => option.id === question.condition!.equals_option_id,
    );
    invariant(
      parentOptionMatched,
      `${templateId}.${question.id} condition option not found on parent: ${question.condition.equals_option_id}`,
    );
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (questionId: string): void => {
    if (visited.has(questionId)) {
      return;
    }

    invariant(!visiting.has(questionId), `${templateId} has cyclic condition chain at ${questionId}`);
    visiting.add(questionId);

    const question = questionById.get(questionId);
    const parentId = question?.condition?.question_id;
    if (parentId) {
      visit(parentId);
    }

    visiting.delete(questionId);
    visited.add(questionId);
  };

  questions.forEach((question) => visit(question.id));
}

export function validateTemplateCollection(templates: Template[]): void {
  const templateIds = new Set<string>();

  for (const template of templates) {
    invariant(!templateIds.has(template.id), `duplicate template id: ${template.id}`);
    templateIds.add(template.id);

    invariant(template.questions.length > 0, `${template.id} has no questions`);

    const questionIds = new Set<string>();
    for (const question of template.questions) {
      invariant(!questionIds.has(question.id), `${template.id} has duplicate question id: ${question.id}`);
      questionIds.add(question.id);
      validateQuestionOptions(template.id, question);
    }

    validateQuestionConditions(template.id, template.questions);
  }
}
