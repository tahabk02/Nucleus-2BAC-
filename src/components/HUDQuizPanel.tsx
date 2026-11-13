import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ChapterId } from '../types/lesson';
import { NUCLEAR_CHAPTERS } from '../data/nuclearPhysicsCurriculum';
import { CHAPTER_QUIZZES, QuizTopic } from '../data/scientistsAndQuiz';
import { MathFormula } from './MathFormula';

type QuizScope = 'chapter' | 'soddy' | 'demi-vie';

interface HUDQuizPanelProps {
  chapterId: ChapterId;
}

const TOPIC_LABELS: Record<QuizTopic, string> = {
  noyau: 'Noyau & Isotopes',
  soddy: 'Lois de Soddy',
  'demi-vie': 'Demi-vie & Décroissance',
  courbes: 'Courbes Usuelles',
  energie: 'Énergie & Δm',
};

export function HUDQuizPanel({ chapterId }: HUDQuizPanelProps) {
  const [scope, setScope] = useState<QuizScope>('chapter');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Sync scope back to active chapter whenever user changes chapter
  useEffect(() => {
    setScope('chapter');
    setQuestionIndex(0);
    setDirection(1);
  }, [chapterId]);

  const activeChapter = useMemo(
    () => NUCLEAR_CHAPTERS.find((c) => c.id === chapterId) ?? NUCLEAR_CHAPTERS[0],
    [chapterId]
  );

  const visibleQuestions = useMemo(() => {
    if (scope === 'soddy') {
      return CHAPTER_QUIZZES.filter((q) => q.topic === 'soddy');
    }
    if (scope === 'demi-vie') {
      return CHAPTER_QUIZZES.filter((q) => q.topic === 'demi-vie');
    }
    const forChapter = CHAPTER_QUIZZES.filter((q) => q.chapterId === chapterId);
    return forChapter.length > 0 ? forChapter : CHAPTER_QUIZZES;
  }, [chapterId, scope]);

  const safeIndex =
    ((questionIndex % visibleQuestions.length) + visibleQuestions.length) %
    visibleQuestions.length;
  const activeQuestion = visibleQuestions[safeIndex] ?? CHAPTER_QUIZZES[0];

  const selectedOption = answers[activeQuestion.id];
  const hasAnswered = typeof selectedOption === 'number';
  const isCorrect = selectedOption === activeQuestion.correctIndex;

  const scopeAnsweredCount = visibleQuestions.filter(
    (q) => typeof answers[q.id] === 'number'
  ).length;
  const scopeCorrectCount = visibleQuestions.filter(
    (q) => answers[q.id] === q.correctIndex
  ).length;
  const totalAnswered = Object.keys(answers).length;
  const totalCorrect = CHAPTER_QUIZZES.filter(
    (q) => answers[q.id] === q.correctIndex
  ).length;

  const optionLetters = ['A', 'B', 'C', 'D'];
  const progressRatio = (totalAnswered / CHAPTER_QUIZZES.length) * 100;

  const handleSelectScope = (nextScope: QuizScope) => {
    setDirection(1);
    setScope(nextScope);
    setQuestionIndex(0);
  };

  const handleNext = () => {
    setDirection(1);
    setQuestionIndex((i) => (i + 1) % visibleQuestions.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setQuestionIndex((i) => (i - 1 + visibleQuestions.length) % visibleQuestions.length);
  };

  return (
    <div className="divide-y divide-white/[0.07]">
      {/* Dynamic HUD Context, Filter Modes & Score Telemetry */}
      <div className="px-4 sm:px-5 py-3 space-y-2.5 bg-[#07090f]/55">
        <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular">
          <div className="text-slate-400 truncate">
            <span>{TOPIC_LABELS[activeQuestion.topic]}</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span className="text-sky-300 font-semibold">
              {totalCorrect}/{CHAPTER_QUIZZES.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-slate-400">
              {scopeCorrectCount}/{visibleQuestions.length} série
            </span>
            {totalAnswered > 0 && (
              <button
                type="button"
                onClick={() => setAnswers({})}
                className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/[0.06] transition-colors"
                title="Réinitialiser les réponses"
                aria-label="Réinitialiser les réponses"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Scope Switcher (Active Chapter vs Soddy's Laws vs Half-Life) */}
        <div
          className="flex items-center gap-1 p-0.5 bg-[#07090f] border border-white/[0.06] rounded-lg"
          role="group"
          aria-label="Filtrer les questions du quiz"
        >
          {(
            [
              { id: 'chapter', label: `Chapitre (${CHAPTER_QUIZZES.filter((q) => q.chapterId === chapterId).length})` },
              { id: 'soddy', label: 'Lois de Soddy' },
              { id: 'demi-vie', label: 'Demi-vie t₁/₂' },
            ] as { id: QuizScope; label: string }[]
          ).map((item) => {
            const active = scope === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectScope(item.id)}
                className={`flex-1 py-1 px-2 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#151c2c] text-sky-300'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Overall Progress Line */}
        <div className="h-1 w-full bg-[#07090f] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-sky-400"
            initial={false}
            animate={{ width: `${progressRatio}%` }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Animated Question Card Area (Framer Motion Enter/Exit) */}
      <div className="p-4 sm:p-5 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${scope}-${chapterId}-${activeQuestion.id}`}
            initial={{ opacity: 0, x: direction * 18, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * -18, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Chapter / Question Navigation Header */}
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular text-slate-400">
              <span className="truncate">
                {scope === 'chapter'
                  ? activeChapter.title.replace(/^\d+\.\s*/, '')
                  : scope === 'soddy'
                  ? 'Conservation A & Z · Soddy'
                  : 'Loi N(t) & Demi-vie t₁/₂'}
              </span>

              {visibleQuestions.length > 1 && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="p-1 text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md transition-colors"
                    aria-label="Question précédente"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 text-slate-200">
                    {safeIndex + 1}/{visibleQuestions.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="p-1 text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md transition-colors"
                    aria-label="Question suivante"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Prompt & Optional Equation */}
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-slate-100 leading-relaxed">
                {activeQuestion.prompt}
              </p>
              {activeQuestion.promptLatex && (
                <div className="py-1.5 px-3 rounded-lg bg-[#07090f] border border-white/[0.07] text-sm text-sky-300 overflow-x-auto">
                  <MathFormula latex={activeQuestion.promptLatex} />
                </div>
              )}
            </div>

            {/* Multiple-Choice Options */}
            <div className="space-y-2">
              {activeQuestion.options.map((opt, idx) => {
                const picked = selectedOption === idx;
                const correctOption = idx === activeQuestion.correctIndex;

                let stateClass =
                  'bg-[#07090f] border-white/[0.09] text-slate-100 hover:border-sky-400/60 hover:bg-white/[0.03]';
                let letterClass = 'bg-white/[0.06] text-sky-300';

                if (hasAnswered) {
                  if (correctOption) {
                    stateClass =
                      'bg-emerald-500/15 border-emerald-400/60 text-slate-50';
                    letterClass = 'bg-emerald-400 text-[#07090f]';
                  } else if (picked && !correctOption) {
                    stateClass =
                      'bg-rose-500/15 border-rose-400/60 text-slate-50';
                    letterClass = 'bg-rose-400 text-[#07090f]';
                  } else {
                    stateClass =
                      'bg-[#07090f]/60 border-white/[0.04] text-slate-400 opacity-70';
                    letterClass = 'bg-white/[0.03] text-slate-500';
                  }
                }

                return (
                  <motion.button
                    key={`${activeQuestion.id}-opt-${idx}`}
                    type="button"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.18,
                      delay: idx * 0.035,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [activeQuestion.id]: idx,
                      }))
                    }
                    className={`w-full text-left px-3 py-2.5 text-xs rounded-xl border transition-colors flex items-center justify-between gap-2.5 ${stateClass}`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-md font-mono-tabular text-[11px] font-semibold flex items-center justify-center shrink-0 ${letterClass}`}
                      >
                        {optionLetters[idx] ?? idx + 1}
                      </span>
                      <span className="min-w-0">
                        {opt.latex ? (
                          <MathFormula latex={opt.latex} />
                        ) : (
                          opt.label
                        )}
                      </span>
                    </span>

                    {hasAnswered && correctOption && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {hasAnswered && picked && !correctOption && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Animated KaTeX Correction Reveal */}
            <AnimatePresence>
              {hasAnswered && (
                <motion.div
                  key={`${activeQuestion.id}-feedback`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="pt-3 border-t border-white/[0.07] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-emerald-300">Réponse exacte</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span className="text-rose-300">Correction 2BAC</span>
                        </>
                      )}
                    </div>

                    {visibleQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-sky-300 hover:text-sky-200 bg-sky-400/10 hover:bg-sky-400/18 border border-sky-400/30 rounded-md transition-colors whitespace-nowrap shrink-0"
                      >
                        <span>Suivante</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-sky-300 overflow-x-auto py-0.5">
                    <MathFormula latex={activeQuestion.explanationLatex} />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {activeQuestion.explanationText}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Series Summary Line when all visible questions completed */}
            {scopeAnsweredCount === visibleQuestions.length &&
              visibleQuestions.length > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono-tabular text-emerald-300"
                >
                  <span>Série complétée · {scopeCorrectCount}/{visibleQuestions.length} réussies</span>
                </motion.div>
              )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
