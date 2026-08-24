import { useMemo, useState } from 'react';
import { CATEGORY_LABELS } from '../lib/analyze';
import type { Suggestion } from '../lib/types';

type Filter = 'all' | 'fix' | 'praise';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'fix', label: 'Needs work' },
  { id: 'praise', label: 'Working well' },
];

export function SuggestionList({ suggestions }: { suggestions: Suggestion[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    if (filter === 'praise') return suggestions.filter((s) => s.severity === 'praise');
    if (filter === 'fix') return suggestions.filter((s) => s.severity !== 'praise');
    return suggestions;
  }, [suggestions, filter]);

  const actionable = suggestions.filter((s) => s.severity !== 'praise').length;

  return (
    <section className="card">
      <div className="card-head">
        <h2>
          Suggestions
          {actionable > 0 && <span className="suggestion-tag">{actionable} to fix</span>}
        </h2>
        <div className="filters">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`filter${filter === option.id ? ' is-active' : ''}`}
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="hint">Nothing in this category.</p>
      ) : (
        <ul className="suggestions">
          {visible.map((item) => (
            <li className={`suggestion sev-${item.severity}`} key={item.id}>
              <span className={`suggestion-dot sev-${item.severity}`} aria-hidden="true" />
              <div>
                <h4>
                  {item.title}
                  <span className="suggestion-tag">{CATEGORY_LABELS[item.category]}</span>
                </h4>
                <p>{item.detail}</p>
                {item.example && <div className="suggestion-example">{item.example}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
