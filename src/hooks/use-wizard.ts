"use client";

import { useCallback, useMemo, useReducer } from "react";
import type {
  CustomInputs,
  PromptBuildResult,
  Selections,
  Template,
  TemplateQuestion,
} from "@/lib/types";
import { buildPrompt, getVisibleQuestions } from "@/lib/prompt-builder";

/* ------------------------------------------------------------------ */
/*  State & Reducer                                                    */
/* ------------------------------------------------------------------ */

interface WizardState {
  templateId: string;
  step: number;
  selections: Selections;
  customInputs: CustomInputs;
  completedQuestionIds: string[];
}

type WizardAction =
  | { type: "SET_TEMPLATE"; templateId: string }
  | { type: "SELECT_SINGLE"; questionId: string; optionId: string }
  | { type: "TOGGLE_MULTI"; questionId: string; optionId: string }
  | { type: "SET_CUSTOM_INPUT"; questionId: string; value: string }
  | { type: "NEXT"; questionId: string; totalSteps: number }
  | { type: "PREV" }
  | { type: "GO_TO"; step: number }
  | { type: "RESET" };

function hasQuestionAnswer(
  question: TemplateQuestion,
  selections: Selections,
  customInputs: CustomInputs,
): boolean {
  const selection = selections[question.id];
  const hasSelection = Array.isArray(selection) ? selection.length > 0 : Boolean(selection);
  const hasCustomInput =
    question.question_kind === "prompt_input" &&
    Boolean(customInputs[question.id]?.trim());

  return hasSelection || hasCustomInput;
}

function pruneState(template: Template, state: WizardState): WizardState {
  const visibleQuestions = getVisibleQuestions(template, state.selections);
  const visibleQuestionIds = new Set(visibleQuestions.map((question) => question.id));
  const questionMap = new Map(
    visibleQuestions.map((question) => [question.id, question] as const),
  );

  let changed = false;

  const nextSelections = Object.fromEntries(
    Object.entries(state.selections).filter(([questionId]) => {
      const keep = visibleQuestionIds.has(questionId);
      if (!keep) {
        changed = true;
      }
      return keep;
    }),
  ) as Selections;

  const nextCustomInputs = Object.fromEntries(
    Object.entries(state.customInputs).filter(([questionId]) => {
      const keep = visibleQuestionIds.has(questionId);
      if (!keep) {
        changed = true;
      }
      return keep;
    }),
  ) as CustomInputs;

  const nextCompletedQuestionIds = state.completedQuestionIds.filter((questionId) => {
    const question = questionMap.get(questionId);
    const keep =
      question !== undefined &&
      hasQuestionAnswer(question, nextSelections, nextCustomInputs);
    if (!keep) {
      changed = true;
    }
    return keep;
  });

  const nextStep = Math.min(state.step, visibleQuestions.length);
  if (nextStep !== state.step) {
    changed = true;
  }

  if (!changed) {
    return state;
  }

  return {
    ...state,
    step: nextStep,
    selections: nextSelections,
    customInputs: nextCustomInputs,
    completedQuestionIds: nextCompletedQuestionIds,
  };
}

function reducer(template: Template, state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_TEMPLATE":
      return {
        templateId: action.templateId,
        step: 0,
        selections: {},
        customInputs: {},
        completedQuestionIds: [],
      };
    case "SELECT_SINGLE":
      return pruneState(template, {
        ...state,
        selections: {
          ...state.selections,
          [action.questionId]: action.optionId,
        },
      });
    case "TOGGLE_MULTI": {
      const previous = (state.selections[action.questionId] as string[]) || [];
      const exists = previous.includes(action.optionId);
      const next = exists
        ? previous.filter((id) => id !== action.optionId)
        : [...previous, action.optionId];
      return pruneState(template, {
        ...state,
        selections: {
          ...state.selections,
          [action.questionId]: next,
        },
      });
    }
    case "NEXT":
      return {
        ...state,
        step: Math.min(state.step + 1, action.totalSteps),
        completedQuestionIds: state.completedQuestionIds.includes(action.questionId)
          ? state.completedQuestionIds
          : [...state.completedQuestionIds, action.questionId],
      };
    case "PREV":
      return { ...state, step: Math.max(0, state.step - 1) };
    case "GO_TO":
      return { ...state, step: action.step };
    case "SET_CUSTOM_INPUT":
      return pruneState(template, {
        ...state,
        customInputs: {
          ...state.customInputs,
          [action.questionId]: action.value,
        },
      });
    case "RESET":
      return {
        ...state,
        step: 0,
        selections: {},
        customInputs: {},
        completedQuestionIds: [],
      };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useWizard(template: Template) {
  const [state, dispatch] = useReducer(
    (currentState: WizardState, action: WizardAction) =>
      reducer(template, currentState, action),
    {
      templateId: template.id,
      step: 0,
      selections: {},
      customInputs: {},
      completedQuestionIds: [],
    },
  );

  const visibleQuestions = useMemo(
    () => getVisibleQuestions(template, state.selections),
    [template, state.selections],
  );

  const currentQuestion = visibleQuestions[state.step] ?? null;
  const totalSteps = visibleQuestions.length;
  const isLastStep = state.step >= totalSteps - 1;
  const isComplete = state.step >= totalSteps;

  const buildResult: PromptBuildResult = useMemo(
    () => buildPrompt(template, state.selections, state.customInputs),
    [template, state.selections, state.customInputs],
  );

  const selectSingle = useCallback((questionId: string, optionId: string) => {
    dispatch({ type: "SELECT_SINGLE", questionId, optionId });
  }, []);

  const toggleMulti = useCallback((questionId: string, optionId: string) => {
    dispatch({ type: "TOGGLE_MULTI", questionId, optionId });
  }, []);

  const next = useCallback(() => {
    if (
      !currentQuestion ||
      !hasQuestionAnswer(currentQuestion, state.selections, state.customInputs)
    ) {
      return;
    }

    dispatch({
      type: "NEXT",
      questionId: currentQuestion.id,
      totalSteps: visibleQuestions.length,
    });
  }, [currentQuestion, state.customInputs, state.selections, visibleQuestions.length]);
  const prev = useCallback(() => dispatch({ type: "PREV" }), []);
  const goTo = useCallback((step: number) => dispatch({ type: "GO_TO", step }), []);
  const setCustomInput = useCallback((questionId: string, value: string) => {
    dispatch({ type: "SET_CUSTOM_INPUT", questionId, value });
  }, []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const setTemplate = useCallback((id: string) => {
    dispatch({ type: "SET_TEMPLATE", templateId: id });
  }, []);

  return {
    state,
    visibleQuestions,
    currentQuestion,
    totalSteps,
    isLastStep,
    isComplete,
    isQuestionAnswered: (question: TemplateQuestion) =>
      hasQuestionAnswer(question, state.selections, state.customInputs),
    buildResult,
    selectSingle,
    toggleMulti,
    setCustomInput,
    next,
    prev,
    goTo,
    reset,
    setTemplate,
  };
}
