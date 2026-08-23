import { PLATFORM_LIST, PLATFORMS } from '../lib/analyze';
import type { PlatformId } from '../lib/types';

interface Props {
  value: PlatformId;
  onChange: (platform: PlatformId) => void;
}

/**
 * The same text scores differently per platform, so the target is an explicit
 * choice rather than a hidden default.
 */
export function PlatformSelector({ value, onChange }: Props) {
  const active = PLATFORMS[value];

  return (
    <section className="card">
      <div className="card-head">
        <h2>Target platform</h2>
      </div>
      <div className="platforms" role="radiogroup" aria-label="Target platform">
        {PLATFORM_LIST.map((platform) => (
          <button
            key={platform.id}
            type="button"
            role="radio"
            aria-checked={value === platform.id}
            className={`platform${value === platform.id ? ' is-active' : ''}`}
            onClick={() => onChange(platform.id)}
          >
            {platform.name}
          </button>
        ))}
      </div>
      <p className="platform-blurb">
        {active.blurb} · best at {active.sweetSpot[0]}–{active.sweetSpot[1]} characters
        {' '}and {active.hashtags[0]}–{active.hashtags[1]} hashtags.
      </p>
    </section>
  );
}
