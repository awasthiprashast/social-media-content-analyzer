import type { Metrics } from '../lib/types';

function readingTime(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  return `${Math.round(seconds / 60)}m`;
}

export function MetricsPanel({ metrics }: { metrics: Metrics }) {
  const stats: { label: string; value: string | number; title?: string }[] = [
    { label: 'Characters', value: metrics.characters.toLocaleString() },
    { label: 'Words', value: metrics.words.toLocaleString() },
    { label: 'Sentences', value: metrics.sentences },
    {
      label: 'Reading ease',
      value: metrics.readingEase.toFixed(0),
      title: 'Flesch Reading Ease. 60 or above is plain English.',
    },
    {
      label: 'Grade level',
      value: metrics.gradeLevel.toFixed(1),
      title: 'Flesch-Kincaid grade level. Social feeds reward grade 6 to 8.',
    },
    { label: 'Read time', value: readingTime(metrics.readingTimeSeconds) },
    { label: 'Hashtags', value: metrics.hashtags.length },
    { label: 'Mentions', value: metrics.mentions.length },
    { label: 'Links', value: metrics.links.length },
    { label: 'Emoji', value: metrics.emojis.length },
    { label: 'Questions', value: metrics.questions },
    {
      label: 'Sentiment',
      value: metrics.sentiment > 0 ? `+${metrics.sentiment.toFixed(2)}` : metrics.sentiment.toFixed(2),
      title: 'Lexicon sentiment from -1 (negative) to +1 (positive).',
    },
  ];

  return (
    <section className="card">
      <div className="card-head">
        <h2>Metrics</h2>
      </div>
      <div className="stats">
        {stats.map((stat) => (
          <div className="stat" key={stat.label} title={stat.title}>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
      {metrics.hashtags.length > 0 && (
        <div className="meta-row" style={{ marginTop: 14, marginBottom: 0 }}>
          {metrics.hashtags.slice(0, 20).map((tag, index) => (
            <span className="chip chip-accent" key={`${tag}-${index}`}>{tag}</span>
          ))}
        </div>
      )}
    </section>
  );
}
