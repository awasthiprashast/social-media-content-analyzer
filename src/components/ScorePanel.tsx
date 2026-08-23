import { CATEGORY_LABELS } from '../lib/analyze';
import type { AnalysisResult } from '../lib/types';

const DIAL_SIZE = 116;
const DIAL_STROKE = 9;
const RADIUS = (DIAL_SIZE - DIAL_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Colour bands shared by the dial and the category bars. */
function colorFor(score: number): string {
  if (score >= 80) return 'var(--praise)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--critical)';
}

function verdict(score: number): { headline: string; detail: string } {
  if (score >= 90) {
    return {
      headline: 'Ready to post',
      detail: 'This post hits nearly every engagement lever. Ship it.',
    };
  }
  if (score >= 75) {
    return {
      headline: 'Strong, with room to sharpen',
      detail: 'The fundamentals are solid. The fixes below are quick wins.',
    };
  }
  if (score >= 60) {
    return {
      headline: 'Decent draft',
      detail: 'Several changes below would meaningfully lift engagement.',
    };
  }
  if (score >= 40) {
    return {
      headline: 'Needs work',
      detail: 'Start with the red items — they cost the most reach.',
    };
  }
  return {
    headline: 'Rewrite recommended',
    detail: 'Most engagement signals are missing. Work down the list below.',
  };
}

export function ScorePanel({ analysis }: { analysis: AnalysisResult }) {
  const { score, grade, categories } = analysis;
  const { headline, detail } = verdict(score);
  const offset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Engagement score</h2>
      </div>

      <div className="score-row">
        <svg
          className="dial"
          width={DIAL_SIZE}
          height={DIAL_SIZE}
          viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
          role="img"
          aria-label={`Engagement score ${score} out of 100, grade ${grade}`}
        >
          <circle
            className="dial-track"
            cx={DIAL_SIZE / 2}
            cy={DIAL_SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={DIAL_STROKE}
          />
          <circle
            className="dial-value"
            cx={DIAL_SIZE / 2}
            cy={DIAL_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={colorFor(score)}
            strokeWidth={DIAL_STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${DIAL_SIZE / 2} ${DIAL_SIZE / 2})`}
          />
          <text
            className="dial-number"
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            dy="-2"
          >
            {score}
          </text>
          <text
            className="dial-grade"
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            dy="18"
          >
            GRADE {grade}
          </text>
        </svg>

        <div className="score-summary">
          <h3>{headline}</h3>
          <p>{detail}</p>
        </div>
      </div>

      <div className="bars">
        {categories.map((category) => (
          <div className="bar-row" key={category.category}>
            <span className="bar-label">{CATEGORY_LABELS[category.category]}</span>
            <div
              className="bar-track"
              role="meter"
              aria-valuenow={category.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={CATEGORY_LABELS[category.category]}
            >
              <div
                className="bar-fill"
                style={{
                  width: `${category.score}%`,
                  background: colorFor(category.score),
                }}
              />
            </div>
            <span className="bar-score">{category.score}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
