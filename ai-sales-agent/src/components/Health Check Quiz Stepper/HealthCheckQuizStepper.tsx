import { JSX, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Image, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HealthCheckQuizStepperProps,
  QuestionItem,
  QuestionItemFields,
} from './HealthCheckQuizStepper.props';
import { normalizeHref } from 'lib/useLinkNormalizer';

// ─── Shared field normalization helpers ───────────────────────────────────────

const normalizeSitecoreField = (field: any): any => {
  if (field === null || field === undefined) return field;
  if (typeof field === 'string') return { value: field };
  if (typeof field === 'number') return { value: field };
  if (typeof field !== 'object') return field;

  if (field.jsonValue !== undefined) {
    const inner =
      typeof field.jsonValue === 'object' && field.jsonValue !== null
        ? { ...field.jsonValue }
        : { value: field.jsonValue };
    return {
      ...inner,
      metadata: field.metadata ?? inner.metadata,
      editable: field.editable ?? inner.editable,
    };
  }
  return field;
};

const mapSitecoreFields = (fieldsArray: any[]): Record<string, any> => {
  if (!Array.isArray(fieldsArray)) return {};
  return fieldsArray.reduce(
    (acc, f) => {
      acc[f.name] = normalizeSitecoreField(f);
      return acc;
    },
    {} as Record<string, any>
  );
};

const resolveField = (obj: any, ...keys: string[]): any => {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined) return normalizeSitecoreField(obj[key]);
  }
  const objKeys = Object.keys(obj);
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
    const matched = objKeys.find(
      (k) => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedKey
    );
    if (matched && obj[matched] !== undefined) {
      return normalizeSitecoreField(obj[matched]);
    }
  }
  return undefined;
};

const getStringValue = (field: any): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'number') return String(field);
  if (field.value !== undefined) return String(field.value ?? '');
  if (field.jsonValue?.value !== undefined) return String(field.jsonValue.value ?? '');
  return '';
};

const getNumberValue = (field: any): number => {
  if (field === null || field === undefined) return 0;
  if (typeof field === 'number') return field;
  if (typeof field === 'string') return parseFloat(field) || 0;
  const raw = field?.value ?? field?.jsonValue?.value;
  if (raw !== undefined) return parseFloat(String(raw)) || 0;
  return 0;
};

/**
 * Resolves points from CMS author field if configured, falling back to client standard:
 * Option A = 10 points
 * Option B = 5 points
 * Option C = 0 points
 */
const getOptionPoints = (key: string, field: any): number => {
  if (field !== undefined && field !== null) {
    const raw = field?.value ?? field?.jsonValue?.value ?? field;
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      const parsed = parseFloat(String(raw));
      if (!isNaN(parsed)) return parsed;
    }
  }
  return key === 'A' ? 10 : key === 'B' ? 5 : 0;
};

const normalizeQuestionFields = (item: QuestionItem): QuestionItemFields => {
  if (!item) return {};
  const raw = item.fields;
  if (!raw) return {};
  if (Array.isArray(raw)) {
    return mapSitecoreFields(raw) as QuestionItemFields;
  }
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    result[k] = normalizeSitecoreField(v);
  }
  return result as QuestionItemFields;
};

/**
 * Dynamically resolves the URL anchor / identifier from the authored QuestionNumber field.
 * Avoids any hardcoded "q" or fixed index schemes, capturing the exact content from Sitecore / Page Builder.
 */
const getQuestionAnchor = (item: QuestionItem | undefined, fallbackIndex: number): string => {
  if (!item) return `q${fallbackIndex + 1}`;
  const qFields = normalizeQuestionFields(item);
  const qNumField =
    resolveField(
      qFields as any,
      'QuestionNumber',
      'Question Number',
      'questionNumber',
      'question_number'
    ) ||
    resolveField(
      item as any,
      'QuestionNumber',
      'Question Number',
      'questionNumber',
      'question_number'
    );

  const authoredValue = getStringValue(qNumField);
  if (authoredValue && authoredValue.trim()) {
    return authoredValue.trim().replace(/^#+/, '');
  }

  return `q${fallbackIndex + 1}`;
};

// ─── Sub-components ────────────────────────────────────────────────────────────

interface OptionButtonProps {
  optionKey: string;
  textField: any;
  isSelected: boolean;
  isEditing: boolean;
  onClick: () => void;
}

const OptionButton = ({
  optionKey,
  textField,
  isSelected,
  isEditing,
  onClick,
}: OptionButtonProps): JSX.Element => (
  <button
    onClick={onClick}
    disabled={isEditing}
    className={`flex items-center p-4 text-left transition-all duration-200 border-2 rounded-xl w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#079bea] ${
      isSelected
        ? 'border-[#079bea] bg-blue-50 shadow-sm shadow-blue-100'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
    }`}
    aria-pressed={isSelected}
  >
    <div
      className={`flex items-center justify-center w-8 h-8 mr-4 text-sm font-extrabold rounded-full shrink-0 transition-colors duration-200 ${
        isSelected ? 'bg-[#079bea] text-white' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {optionKey}
    </div>
    <span className="text-sm font-medium text-gray-800 md:text-base leading-snug">
      <Text field={textField} />
    </span>
  </button>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const HealthCheckQuizStepper = (props: HealthCheckQuizStepperProps): JSX.Element => {
  const router = useRouter();
  const { page } = useSitecore();
  const isEditing = Boolean(page?.mode?.isEditing);

  // ── Resolve root fields from all Sitecore response shapes ──────────────────
  const rawProps = props?.fields as any;
  const datasource = rawProps?.data?.datasource;

  let rootFields: any = {};
  if (datasource) {
    rootFields = Array.isArray(datasource.fields)
      ? mapSitecoreFields(datasource.fields)
      : datasource.fields || datasource;
  } else {
    rootFields = Array.isArray(rawProps) ? mapSitecoreFields(rawProps) : rawProps || {};
  }

  // ── Resolve the Questions list (targetItems | array | inline) ──────────────
  const rawQuestions =
    resolveField(rootFields, 'Questions') ||
    (datasource as any)?.Questions?.targetItems ||
    (datasource as any)?.questions?.targetItems;

  const questions: QuestionItem[] = Array.isArray(rawQuestions)
    ? rawQuestions
    : Array.isArray(rawQuestions?.targetItems)
      ? rawQuestions.targetItems
      : [];

  // Deduplicate by id
  const uniqueQuestions = questions.filter((q, idx, arr) => {
    if (!q?.id) return true;
    return idx === arr.findIndex((x) => x?.id === q?.id);
  });

  // ── UI state ───────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<
    Record<
      string,
      {
        option: string;
        optionText?: string;
        points: number;
        questionTitle?: string;
        zoneKey: string;
        zoneLabel: string;
        questionIndex: number;
        questionId?: string;
      }
    >
  >(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('hygiene-quiz-answers');
        localStorage.removeItem('hygiene-check');
      } catch {
        // Ignore storage errors
      }

      // If landing on the first question or URL without a hash, start fresh with no prefilled options
      const rawHash = (window.location.hash || '').replace(/^#+/, '').trim().toLowerCase();
      const firstAnchor = uniqueQuestions[0]
        ? getQuestionAnchor(uniqueQuestions[0], 0).toLowerCase()
        : 'q1';

      if (!rawHash || rawHash === firstAnchor || rawHash === 'q0' || rawHash === 'q1') {
        try {
          sessionStorage.removeItem('hygiene-quiz-answers');
          sessionStorage.removeItem('hygiene-check');
          sessionStorage.removeItem('hygiene-check-lead');
        } catch {
          // Ignore
        }
        return {};
      }

      try {
        const savedQuiz = sessionStorage.getItem('hygiene-quiz-answers');
        if (savedQuiz) return JSON.parse(savedQuiz);
      } catch {
        // Ignore JSON or storage errors
      }
    }
    return {};
  });
  const [direction, setDirection] = useState<1 | -1>(1);

  // ── Browser History Helper: Preserves Next.js route state and cleans ?path= parameters ──
  const updateHistoryStep = useCallback(
    (stepIndex: number, push = true) => {
      if (typeof window === 'undefined') return;
      try {
        const q = uniqueQuestions[stepIndex];
        const anchor = getQuestionAnchor(q, stepIndex);
        const currentState = window.history.state || {};
        const url = new URL(window.location.href);
        // Remove leaked Next.js catch-all ?path= query parameters
        url.searchParams.delete('path');
        url.hash = anchor;
        const cleanPath = url.pathname + (url.search ? url.search : '') + url.hash;

        const nextState = {
          ...currentState,
          as: url.pathname + (url.search ? url.search : ''),
          url: url.pathname + (url.search ? url.search : ''),
          step: stepIndex,
          questionAnchor: anchor,
        };

        if (push) {
          window.history.pushState(nextState, '', cleanPath);
        } else {
          window.history.replaceState(nextState, '', cleanPath);
        }
      } catch {
        try {
          const q = uniqueQuestions[stepIndex];
          const anchor = getQuestionAnchor(q, stepIndex);
          if (push) {
            window.history.pushState(null, '', `#${anchor}`);
          } else {
            window.history.replaceState(null, '', `#${anchor}`);
          }
        } catch {
          // Ignore fallback history error
        }
      }
    },
    [uniqueQuestions]
  );

  // ── Hash routing: read initial hash on load or handle browser back/forward ──
  useEffect(() => {
    if (uniqueQuestions.length === 0) return;

    const syncFromHash = () => {
      const rawHash = window.location.hash.replace(/^#+/, '').trim().toLowerCase();
      if (!rawHash) {
        // When hash is cleared or user navigated all the way back to base url
        setCurrentStep((prev) => {
          if (prev !== 0) {
            setDirection(-1);
          }
          return 0;
        });
        return;
      }

      // 1. Dynamic match against authored QuestionNumber on each question
      const matchedIdx = uniqueQuestions.findIndex((q, idx) => {
        const anchor = getQuestionAnchor(q, idx).toLowerCase();
        return anchor === rawHash;
      });

      if (matchedIdx !== -1) {
        setCurrentStep((prev) => {
          if (prev !== matchedIdx) {
            setDirection(matchedIdx > prev ? 1 : -1);
          }
          return matchedIdx;
        });
      } else {
        // 2. Fallback for legacy numeric or 0-indexed URLs (e.g. #q0, #q1, #0, #1)
        const match = rawHash.match(/^q?(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          const target = num > 0 && num <= uniqueQuestions.length ? num - 1 : num;
          if (target >= 0 && target < uniqueQuestions.length) {
            setCurrentStep((prev) => {
              if (prev !== target) {
                setDirection(target > prev ? 1 : -1);
              }
              return target;
            });
          }
        }
      }
    };

    if (window.location.hash) {
      syncFromHash();
      // Clean query string if ?path= is present on initial load
      if (window.location.search && window.location.search.includes('path=')) {
        const rawHash = window.location.hash.replace(/^#+/, '').trim().toLowerCase();
        const matchedIdx = uniqueQuestions.findIndex((q, idx) => {
          const anchor = getQuestionAnchor(q, idx).toLowerCase();
          return anchor === rawHash;
        });
        updateHistoryStep(matchedIdx !== -1 ? matchedIdx : 0, false);
      }
    } else {
      updateHistoryStep(0, false);
    }

    window.addEventListener('popstate', syncFromHash);
    window.addEventListener('hashchange', syncFromHash);
    return () => {
      window.removeEventListener('popstate', syncFromHash);
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, [uniqueQuestions, updateHistoryStep]);

  // ── Resolved root-level text fields ───────────────────────────────────────
  const nextButtonTextField = resolveField(rootFields, 'NextButtonText', 'Next Button Text');
  const calculateButtonTextField = resolveField(
    rootFields,
    'CalculateButtonText',
    'Calculate Button Text'
  );
  const stepFormatField = resolveField(rootFields, 'StepFormat', 'Step Format');
  const resultsPageLinkField = resolveField(
    rootFields,
    'ResultsPageLink',
    'Results Page Link',
    'resultsPageLink'
  );

  const calculateButtonText =
    resultsPageLinkField?.value?.text ||
    resultsPageLinkField?.text ||
    resultsPageLinkField?.jsonValue?.value?.text ||
    resultsPageLinkField?.value?.title ||
    getStringValue(calculateButtonTextField) ||
    'Calculate';

  const stepFormatString = getStringValue(stepFormatField) || 'Question {0} / {1}';

  // ── Current question resolution ────────────────────────────────────────────
  const currentQuestion = uniqueQuestions[currentStep];
  const isLastQuestion = currentStep === uniqueQuestions.length - 1;
  const currentCanonicalKey = `Q${currentStep + 1}`;
  const currentQuestionAnchor = getQuestionAnchor(currentQuestion, currentStep);
  const currentQuestionKey = currentQuestionAnchor.toUpperCase();
  const currentSelection =
    answers[currentCanonicalKey]?.option ||
    answers[currentQuestionKey]?.option ||
    answers[currentQuestionAnchor]?.option ||
    answers[`q${currentStep + 1}`]?.option;

  const qFields: QuestionItemFields = currentQuestion
    ? normalizeQuestionFields(currentQuestion)
    : {};

  const zoneKeyField = resolveField(qFields as any, 'ZoneKey', 'Zone Key');
  const zoneLabelField = resolveField(qFields as any, 'ZoneLabel', 'Zone Label');
  const questionTextField = resolveField(qFields as any, 'QuestionText', 'Question Text');

  const answerATextField = resolveField(qFields as any, 'AnswerA_Text', 'Answer A Text', 'AnswerAText');
  const answerAPointsField = resolveField(qFields as any, 'AnswerA_Points', 'Answer A Points', 'AnswerAPoints');
  const answerBTextField = resolveField(qFields as any, 'AnswerB_Text', 'Answer B Text', 'AnswerBText');
  const answerBPointsField = resolveField(qFields as any, 'AnswerB_Points', 'Answer B Points', 'AnswerBPoints');
  const answerCTextField = resolveField(qFields as any, 'AnswerC_Text', 'Answer C Text', 'AnswerCText');
  const answerCPointsField = resolveField(qFields as any, 'AnswerC_Points', 'Answer C Points', 'AnswerCPoints');

  const authorZoneLabel = getStringValue(zoneLabelField) || getStringValue(zoneKeyField);
  const currentZoneLabel =
    authorZoneLabel && authorZoneLabel.trim()
      ? authorZoneLabel.trim()
      : `Zone ${currentStep + 1}`;

  const currentZoneKey =
    getStringValue(zoneKeyField) ||
    currentZoneLabel.toLowerCase().replace(/\s+/g, '_');

  const zoneImageField =
    resolveField(
      qFields as any,
      'ZoneImage',
      'Zone Image',
      'zoneImage',
      'Image',
      'image',
      'Picture',
      'picture',
      'BackgroundImage',
      'Background Image',
      'Photo',
      'photo'
    ) ||
    resolveField(
      currentQuestion as any,
      'ZoneImage',
      'Zone Image',
      'zoneImage',
      'Image',
      'image',
      'Picture',
      'picture',
      'BackgroundImage',
      'Background Image'
    ) ||
    resolveField(
      rootFields,
      'ZoneImage',
      'Zone Image',
      'Image',
      'image',
      'BackgroundImage'
    );

  const hasZoneImage = Boolean(
    zoneImageField?.value?.src ||
    zoneImageField?.src ||
    zoneImageField?.jsonValue?.value?.src ||
    (typeof zoneImageField === 'string' && zoneImageField.trim().length > 0)
  );

  const safeImageField =
    typeof zoneImageField === 'string'
      ? { value: { src: zoneImageField } }
      : zoneImageField;

  const stepDisplayText = stepFormatString
    .replace('{0}', String(currentStep + 1))
    .replace('{1}', String(uniqueQuestions.length));

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleOptionSelect = (optionKey: string, pointsField: any) => {
    // Dynamic points from Sitecore content with standard client fallback (A=10, B=5, C=0)
    const points = getOptionPoints(optionKey, pointsField);

    const opt = options.find((o) => o.key === optionKey);
    const optionText = getStringValue(opt?.textField) || optionKey;
    const questionTitle = getStringValue(questionTextField) || `Question ${currentStep + 1}`;

    const currentCanonicalKey = `Q${currentStep + 1}`;
    const newAnswer = {
      option: optionKey,
      optionText,
      points,
      questionTitle,
      zoneKey: currentZoneKey,
      zoneLabel: currentZoneLabel,
      questionIndex: currentStep,
      questionId: currentQuestion?.id || currentCanonicalKey,
    };

    setAnswers((prev) => {
      const updated = {
        ...prev,
        [currentCanonicalKey]: newAnswer,
      };
      // Prevent lowercase or anchor duplicates
      delete updated[`q${currentStep + 1}`];
      delete updated[currentQuestionAnchor.toLowerCase()];

      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('hygiene-quiz-answers', JSON.stringify(updated));
        } catch {
          // Ignore storage quota errors
        }
      }
      return updated;
    });
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Gather all answers from React state, sessionStorage, and hygiene-check (strictly sessionStorage)
      let allAnswers: Record<string, any> = {};
      try {
        const hcRaw = sessionStorage.getItem('hygiene-check');
        if (hcRaw) {
          const parsed = JSON.parse(hcRaw);
          if (parsed.detailedAnswers && typeof parsed.detailedAnswers === 'object') {
            allAnswers = { ...parsed.detailedAnswers };
          }
        }
        const saved = sessionStorage.getItem('hygiene-quiz-answers');
        if (saved) {
          allAnswers = { ...allAnswers, ...JSON.parse(saved) };
        }
      } catch {
        // Fall back
      }
      allAnswers = { ...allAnswers, ...answers };

      // Ensure current selection on the last question is explicitly included with updated choice
      if (currentSelection) {
        const opt = options.find((o) => o.key === currentSelection);
        const pts = getOptionPoints(currentSelection, opt?.pointsField);
        const optionText = getStringValue(opt?.textField) || currentSelection;
        const questionTitle = getStringValue(questionTextField) || `Question ${currentStep + 1}`;

        allAnswers[`Q${currentStep + 1}`] = {
          option: currentSelection,
          optionText,
          points: pts,
          questionTitle,
          zoneKey: currentZoneKey,
          zoneLabel: currentZoneLabel,
          questionIndex: currentStep,
          questionId: currentQuestion?.id || `Q${currentStep + 1}`,
        };
      }

      // ── Process each of the configured questions dynamically from Sitecore (NO hardcoded scoring) ──
      const formatZoneKeyToCamel = (str: string): string => {
        const cleaned = str.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
        if (!cleaned) return 'zone';
        const parts = cleaned.split(/\s+/);
        return (
          parts[0].toLowerCase() +
          parts
            .slice(1)
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join('')
        );
      };

      const sanitizedDetailedAnswers: Record<string, any> = {};
      const answersArray: string[] = [];
      let calculatedRawScore = 0;
      let totalMaxScore = 0;
      const zoneMaxMap: Record<string, number> = {};
      const zoneScores: Record<string, number> = {};

      uniqueQuestions.forEach((q, idx) => {
        const qF = normalizeQuestionFields(q);
        const qCanonicalKey = `Q${idx + 1}`;
        const qAnchor = getQuestionAnchor(q, idx);

        // Find user answer by canonical key, anchor key, or fallback
        const ans =
          allAnswers[qCanonicalKey] ||
          allAnswers[qAnchor.toUpperCase()] ||
          allAnswers[qAnchor.toLowerCase()] ||
          allAnswers[`q${idx + 1}`];

        const chosenOption = ans?.option || 'A';
        answersArray.push(chosenOption);

        // Dynamic points from Sitecore Question item fields: AnswerA_Points, AnswerB_Points, AnswerC_Points
        const authorPointsField =
          chosenOption === 'A'
            ? resolveField(qF as any, 'AnswerA_Points', 'Answer A Points', 'AnswerAPoints')
            : chosenOption === 'B'
              ? resolveField(qF as any, 'AnswerB_Points', 'Answer B Points', 'AnswerBPoints')
              : resolveField(qF as any, 'AnswerC_Points', 'Answer C Points', 'AnswerCPoints');

        const pts = typeof ans?.points === 'number' ? ans.points : getOptionPoints(chosenOption, authorPointsField);
        calculatedRawScore += pts;

        // Dynamic question max points from author configuration with client default (10 pts)
        const aPts = getOptionPoints('A', resolveField(qF as any, 'AnswerA_Points', 'Answer A Points', 'AnswerAPoints'));
        const bPts = getOptionPoints('B', resolveField(qF as any, 'AnswerB_Points', 'Answer B Points', 'AnswerBPoints'));
        const cPts = getOptionPoints('C', resolveField(qF as any, 'AnswerC_Points', 'Answer C Points', 'AnswerCPoints'));
        const qMax = Math.max(aPts, bPts, cPts, 10);
        totalMaxScore += qMax;

        const aZLabel =
          getStringValue(resolveField(qF as any, 'ZoneLabel', 'Zone Label')) ||
          getStringValue(resolveField(qF as any, 'ZoneKey', 'Zone Key'));
        const zLabel = aZLabel && aZLabel.trim() ? aZLabel.trim() : `Zone ${idx + 1}`;
        const zKey =
          getStringValue(resolveField(qF as any, 'ZoneKey', 'Zone Key')) ||
          ans?.zoneKey ||
          zLabel;

        const qTitle =
          getStringValue(resolveField(qF as any, 'QuestionText', 'Question Text')) ||
          ans?.questionTitle ||
          `Question ${idx + 1}`;

        const zoneDesc =
          getStringValue(
            resolveField(
              qF as any,
              'ZoneDescription',
              'Zone Description',
              'ZoneSubtitle',
              'Zone Subtitle',
              'Description'
            )
          ) || '';

        const reasonField =
          chosenOption === 'A'
            ? resolveField(
                qF as any,
                'AnswerA_Reason',
                'Answer A Reason',
                'AnswerA_Recommendation',
                'Answer A Recommendation',
                'AnswerAReason'
              )
            : chosenOption === 'B'
              ? resolveField(
                  qF as any,
                  'AnswerB_Reason',
                  'Answer B Reason',
                  'AnswerB_Recommendation',
                  'Answer B Recommendation',
                  'AnswerBReason'
                )
              : resolveField(
                  qF as any,
                  'AnswerC_Reason',
                  'Answer C Reason',
                  'AnswerC_Recommendation',
                  'Answer C Recommendation',
                  'AnswerCReason'
                );
        const answerReason = getStringValue(reasonField) || '';

        const solutionsField = resolveField(
          qF as any,
          'HowWeCanHelp',
          'How We Can Help',
          'SolutionBullets',
          'Solution Bullets',
          'Solutions',
          'SolutionsText'
        );
        const solutionsText = getStringValue(solutionsField) || '';

        const zImgField = resolveField(qF as any, 'ZoneImage', 'Zone Image', 'Image', 'image');
        const zoneImgSrc =
          (zImgField as any)?.value?.src ||
          (zImgField as any)?.src ||
          (zImgField as any)?.jsonValue?.value?.src ||
          (typeof zImgField === 'string' ? zImgField : '');

        const solImgField = resolveField(
          qF as any,
          'SolutionImage',
          'Solution Image',
          'ProductImage',
          'Product Image'
        );
        const solutionImgSrc =
          (solImgField as any)?.value?.src ||
          (solImgField as any)?.src ||
          (solImgField as any)?.jsonValue?.value?.src ||
          (typeof solImgField === 'string' ? solImgField : '');

        sanitizedDetailedAnswers[qCanonicalKey] = {
          option: chosenOption,
          optionText: ans?.optionText || chosenOption,
          points: pts,
          questionTitle: qTitle,
          zoneKey: zKey,
          zoneLabel: zLabel,
          zoneDescription: zoneDesc,
          answerReason: answerReason,
          solutionsText: solutionsText,
          zoneImage: zoneImgSrc,
          solutionImage: solutionImgSrc || '',
          questionIndex: idx,
          questionId: q?.id || qCanonicalKey,
        };

        zoneMaxMap[zLabel] = (zoneMaxMap[zLabel] || 0) + qMax;

        const camelZ = formatZoneKeyToCamel(zKey || zLabel);
        zoneScores[camelZ] = (zoneScores[camelZ] || 0) + pts;
      });

      if (totalMaxScore === 0) {
        totalMaxScore = Math.max(70, uniqueQuestions.length * 10);
      }

      // "Out of 100" Display (for visuals): (total score ÷ max score) × 100
      const displayScore = Math.min(100, Math.round((calculatedRawScore / totalMaxScore) * 100));

      // Dynamic Tier Resolution from Sitecore Tiers (if present on the stepper datasource)
      const rawTiers =
        resolveField(rootFields, 'Tiers', 'tiers') ||
        (datasource as any)?.Tiers?.targetItems ||
        (datasource as any)?.tiers?.targetItems;

      let tierNumber = 1;
      let tierInfo: { title: string; summaryHeadline: string; description: string } = {
        title: '',
        summaryHeadline: '',
        description: '',
      };

      const tiersList: any[] = Array.isArray(rawTiers)
        ? rawTiers
        : Array.isArray(rawTiers?.targetItems)
          ? rawTiers.targetItems
          : [];

      if (tiersList.length > 0) {
        const matchedTier = tiersList.find((t: any) => {
          const tF = typeof t.fields === 'object' && t.fields !== null ? t.fields : {};
          const min = getNumberValue(resolveField(tF, 'MinScore', 'Min Score'));
          const max = getNumberValue(resolveField(tF, 'MaxScore', 'Max Score'));
          return calculatedRawScore >= min && calculatedRawScore <= max;
        });

        if (matchedTier) {
          const tF = typeof matchedTier.fields === 'object' && matchedTier.fields !== null ? matchedTier.fields : {};
          tierInfo = {
            title: getStringValue(resolveField(tF, 'BadgeLabel', 'Badge Label', 'Title', 'title')),
            summaryHeadline: getStringValue(resolveField(tF, 'SummaryHeadline', 'Summary Headline', 'Headline')),
            description: getStringValue(resolveField(tF, 'SummaryText', 'Summary Text', 'Description')),
          };
          const foundIdx = tiersList.indexOf(matchedTier);
          tierNumber = foundIdx !== -1 ? foundIdx + 1 : 1;
        }
      } else {
        // Fallback tier number based on benchmark points if Tiers are authored on Results page
        tierNumber = calculatedRawScore >= 56 || displayScore >= 80 ? 3 : calculatedRawScore >= 35 || displayScore >= 50 ? 2 : 1;
      }

      // UTM params from query string if available
      let utm: Record<string, string> | null = null;
      if (typeof window !== 'undefined' && window.location.search) {
        const searchParams = new URLSearchParams(window.location.search);
        const utmObj: Record<string, string> = {};
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((key) => {
          const val = searchParams.get(key);
          if (val) utmObj[key] = val;
        });
        if (Object.keys(utmObj).length > 0) utm = utmObj;
      }

      // Locale and Region
      const rawLocale =
        router.locale ||
        (page?.layout?.sitecore?.route?.itemLanguage as string) ||
        'en';
      const resolvedLocale = rawLocale === 'en' ? 'en-IE' : rawLocale;
      const region = resolvedLocale.includes('-')
        ? resolvedLocale.split('-')[1].toUpperCase()
        : 'IE';

      const sessionPayload = {
        answers: answersArray,
        detailedAnswers: sanitizedDetailedAnswers,
        c: null,
        formData: {
          firstName: '',
          email: '',
          zip: '',
          city: '',
          phone: '',
          company: '',
          consent: false,
          is_customer: '',
        },
        locale: resolvedLocale,
        region,
        resultsUnlocked: false,
        score: {
          total: calculatedRawScore,
          tier: tierNumber,
          zoneScores,
        },
        tier: tierNumber,
        total: calculatedRawScore,
        zoneScores,
        tierInfo,
        utm,
        // Helper metrics for Results gauge & PDF report
        rawScore: calculatedRawScore,
        maxScore: totalMaxScore,
        displayScore,
        zoneMaxMap,
      };

      sessionStorage.setItem('hygiene-check', JSON.stringify(sessionPayload));
      sessionStorage.setItem('hygiene-quiz-answers', JSON.stringify(sanitizedDetailedAnswers));

      // Extract dynamic URL from Sitecore General Link field
      const rawTargetUrl =
        resultsPageLinkField?.value?.href ||
        resultsPageLinkField?.href ||
        resultsPageLinkField?.jsonValue?.value?.href ||
        (typeof resultsPageLinkField === 'string' ? resultsPageLinkField : '');

      const currentLocale =
        router.locale ||
        (page?.layout?.sitecore?.route?.itemLanguage as string) ||
        'en';

      const normalizedTarget = rawTargetUrl
        ? normalizeHref(rawTargetUrl, currentLocale) || rawTargetUrl
        : null;

      if (normalizedTarget) {
        void router.push(normalizedTarget);
      } else {
        void router.push(`/${currentLocale}/health-check/results/`);
      }
    } else {
      const nextStep = currentStep + 1;
      setDirection(1);
      setCurrentStep(nextStep);
      updateHistoryStep(nextStep, true);
    }
  };

  // ── Editor / no-data fallback ──────────────────────────────────────────────
  if (!currentQuestion && !isEditing) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] p-8 text-gray-500 text-sm">
        Configure questions in Sitecore.
      </div>
    );
  }

  // ── Option definitions ─────────────────────────────────────────────────────
  const options = [
    { key: 'A', textField: answerATextField, pointsField: answerAPointsField },
    { key: 'B', textField: answerBTextField, pointsField: answerBPointsField },
    { key: 'C', textField: answerCTextField, pointsField: answerCPointsField },
  ];

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 48 : -48 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -48 : 48 }),
  };

  return (
    <section className="flex flex-col w-full min-h-screen bg-white md:flex-row">
      {/* ── Left Column: Quiz Content ────────────────────────────────────── */}
      <div className="flex flex-col justify-center w-full p-6 md:w-1/2 md:p-14 lg:p-20 xl:p-24">
        {/* Zone label & progress header */}
        <div className="mb-8">
          <div className="flex items-center justify-between pb-2">
            <span className="text-base font-bold text-[#e2001a] leading-tight">
              {currentZoneLabel}
            </span>
            <span className="text-xs font-semibold text-gray-700 tabular-nums shrink-0 ml-4">
              {stepDisplayText}
            </span>
          </div>
          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#e2001a] transition-all duration-300 rounded-full"
              style={{
                width: `${((currentStep + 1) / Math.max(1, uniqueQuestions.length)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Question text */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`question-${currentStep}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <h2 className="mb-8 text-2xl font-extrabold text-gray-900 md:text-3xl leading-tight tracking-tight">
              <Text field={questionTextField} />
            </h2>

            {/* Answer options */}
            <div className="flex flex-col space-y-3">
              {options.map((opt) => (
                <OptionButton
                  key={opt.key}
                  optionKey={opt.key}
                  textField={opt.textField}
                  isSelected={currentSelection === opt.key}
                  isEditing={isEditing}
                  onClick={() => handleOptionSelect(opt.key, opt.pointsField)}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* CTA buttons */}
        <div className="flex items-center gap-3 mt-10">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => {
                const firstAnchor = '#' + getQuestionAnchor(uniqueQuestions[0], 0).toLowerCase();
                if (
                  typeof window !== 'undefined' &&
                  window.history.length > 1 &&
                  window.location.hash.toLowerCase() !== firstAnchor
                ) {
                  window.history.back();
                } else {
                  const prevStep = Math.max(0, currentStep - 1);
                  setDirection(-1);
                  setCurrentStep(prevStep);
                  updateHistoryStep(prevStep, true);
                }
              }}
              className="flex items-center justify-center gap-1.5 px-6 py-4 font-bold text-gray-700 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full text-sm md:text-base shrink-0"
              aria-label="Previous question"
            >
              <span aria-hidden="true" className="text-base">←</span>
              <span>Back</span>
            </button>
          )}

          <motion.button
            onClick={handleNext}
            disabled={!currentSelection || isEditing}
            whileHover={{ scale: currentSelection && !isEditing ? 1.02 : 1 }}
            whileTap={{ scale: currentSelection && !isEditing ? 0.98 : 1 }}
            className="flex items-center justify-center gap-2 w-full max-w-xs px-8 py-4 font-bold text-white transition-colors rounded-full bg-[#e2001a] hover:bg-[#c50017] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-500/25 text-sm md:text-base"
          >
            {isLastQuestion ? (
              <span>{calculateButtonText}</span>
            ) : (
              <>
                <Text field={nextButtonTextField} />
                <span aria-hidden="true" className="text-base">→</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Step progress dots */}
        {uniqueQuestions.length > 1 && (
          <div className="flex items-center gap-1.5 mt-8" role="tablist" aria-label="Quiz progress">
            {uniqueQuestions.map((q, idx) => {
              const qAnchor = getQuestionAnchor(q, idx);
              const qKey = qAnchor.toUpperCase();
              const isAnswered = Boolean(answers[qKey] || answers[qAnchor] || answers[`Q${idx + 1}`]);
              return (
                <button
                  key={idx}
                  role="tab"
                  aria-selected={idx === currentStep}
                  aria-label={`Question ${idx + 1}`}
                  onClick={() => {
                    if (idx <= currentStep || isAnswered) {
                      setDirection(idx > currentStep ? 1 : -1);
                      setCurrentStep(idx);
                      updateHistoryStep(idx, true);
                    }
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? 'w-8 bg-[#e2001a]'
                      : isAnswered
                        ? 'w-2 bg-red-200 hover:bg-red-300'
                        : 'w-2 bg-gray-200'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right Column: Zone Imagery ───────────────────────────────────── */}
      <div className="relative hidden w-1/2 overflow-hidden bg-white md:flex items-center justify-center p-8 md:p-12 lg:p-16 min-h-screen border-l border-gray-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={`img-${currentStep}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex items-center justify-center w-full h-full max-h-[85vh]"
          >
            {hasZoneImage && (
              <Image
                field={safeImageField}
                className="w-auto h-auto max-w-full max-h-[85vh] object-contain select-none"
                editable={isEditing}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export const Default = HealthCheckQuizStepper;
export default HealthCheckQuizStepper;
export { HealthCheckQuizStepper };
