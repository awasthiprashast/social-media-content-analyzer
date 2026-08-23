import type { Category, Metrics, Suggestion } from '../types';
import type { PlatformProfile } from './platforms';
import { HOOK_PATTERNS, JARGON_WORDS } from './lexicon';
import { clamp } from './metrics';

export interface RuleContext {
  text: string;
  metrics: Metrics;
  platform: PlatformProfile;
}

export interface CategoryOutcome {
  /** 0..100 for this category alone. */
  score: number;
  suggestions: Suggestion[];
}

type Scorer = (ctx: RuleContext) => CategoryOutcome;

function suggestion(
  id: string,
  category: Category,
  severity: Suggestion['severity'],
  title: string,
  detail: string,
  example?: string,
): Suggestion {
  return { id, category, severity, title, detail, example };
}

/**
 * Score a value against an ideal range: full marks inside the range, and a
 * linear falloff outside it that never quite reaches zero, so being slightly
 * off is a nudge rather than a failure.
 */
function rangeScore(value: number, [min, max]: [number, number], tolerance: number): number {
  if (value >= min && value <= max) return 100;
  const distance = value < min ? min - value : value - max;
  return clamp(100 - (distance / tolerance) * 100, 0, 100);
}

/* ------------------------------------------------------------------ hook -- */

const hook: Scorer = ({ metrics, platform }) => {
  const suggestions: Suggestion[] = [];
  const { firstLine } = metrics;
  let score = 50;

  if (!firstLine) {
    return {
      score: 0,
      suggestions: [
        suggestion(
          'hook.empty', 'hook', 'critical',
          'The post has no opening line',
          'Every post needs a first line that earns the second one.',
        ),
      ],
    };
  }

  if (HOOK_PATTERNS.some((re) => re.test(firstLine))) {
    score += 30;
    suggestions.push(
      suggestion(
        'hook.strong', 'hook', 'praise',
        'Strong opening line',
        'Your first line uses a proven hook pattern - a question, a number, or a bold claim. That is what stops the scroll.',
      ),
    );
  } else {
    suggestions.push(
      suggestion(
        'hook.weak', 'hook', 'warning',
        'Open with a sharper hook',
        `Readers see only the first ${platform.previewChars} characters before deciding whether to expand. Lead with a question, a number, or a contrarian claim instead of context.`,
        'Try: "3 mistakes I made before I understood this" or "Most people get this backwards."',
      ),
    );
  }

  if (firstLine.length > platform.previewChars) {
    score -= 15;
    suggestions.push(
      suggestion(
        'hook.truncated', 'hook', 'warning',
        'Your first line gets cut off',
        `On ${platform.name} the preview stops at about ${platform.previewChars} characters, but your opening line runs to ${firstLine.length}. Break the idea up so the hook lands before the fold.`,
      ),
    );
  }

  if (metrics.numbers > 0) score += 10;

  if (metrics.powerWords.length > 0) {
    score += 10;
    const shown = metrics.powerWords.slice(0, 3).join(', ');
    suggestions.push(
      suggestion(
        'hook.power', 'hook', 'praise',
        `Uses ${metrics.powerWords.length} high-impact word${metrics.powerWords.length === 1 ? '' : 's'}`,
        `Words such as ${shown} carry more weight than neutral phrasing.`,
      ),
    );
  }

  return { score: clamp(score, 0, 100), suggestions };
};

/* ---------------------------------------------------------------- length -- */

const length: Scorer = ({ metrics, platform }) => {
  const suggestions: Suggestion[] = [];
  const chars = metrics.characters;
  const [min, max] = platform.sweetSpot;

  if (chars > platform.hardLimit) {
    return {
      score: 0,
      suggestions: [
        suggestion(
          'length.over', 'length', 'critical',
          `Too long for ${platform.name}`,
          `This post is ${chars.toLocaleString()} characters but ${platform.name} allows ${platform.hardLimit.toLocaleString()}. Cut ${(chars - platform.hardLimit).toLocaleString()} characters, or split it into a thread.`,
        ),
      ],
    };
  }

  const score = rangeScore(chars, platform.sweetSpot, Math.max(200, min));

  if (chars < min) {
    suggestions.push(
      suggestion(
        'length.short', 'length', 'tip',
        'Room to say more',
        `At ${chars} characters this is shorter than the ${min}-${max} range that tends to perform best on ${platform.name}. Add a concrete example or a result.`,
      ),
    );
  } else if (chars > max) {
    suggestions.push(
      suggestion(
        'length.long', 'length', 'warning',
        'Consider trimming',
        `At ${chars.toLocaleString()} characters this runs past the ${min}-${max} range that tends to perform best on ${platform.name}. Cutting the setup usually costs nothing.`,
      ),
    );
  } else {
    suggestions.push(
      suggestion(
        'length.ideal', 'length', 'praise',
        `Well sized for ${platform.name}`,
        `${chars} characters sits inside the ${min}-${max} sweet spot.`,
      ),
    );
  }

  return { score, suggestions };
};

/* ----------------------------------------------------------- readability -- */

const readability: Scorer = ({ metrics }) => {
  const suggestions: Suggestion[] = [];
  // Social copy should read easily; a Flesch score of 60+ is plain English.
  let score = clamp((metrics.readingEase / 70) * 100, 0, 100);

  if (metrics.readingEase < 50) {
    suggestions.push(
      suggestion(
        'read.hard', 'readability', 'warning',
        'Hard to skim',
        `This reads at roughly a grade ${metrics.gradeLevel.toFixed(0)} level. Social feeds reward grade 6 to 8. Shorten sentences and swap long words for short ones.`,
      ),
    );
  } else if (metrics.readingEase >= 60) {
    suggestions.push(
      suggestion(
        'read.easy', 'readability', 'praise',
        'Easy to read',
        `A reading ease of ${metrics.readingEase.toFixed(0)} means most people can skim this without effort.`,
      ),
    );
  }

  if (metrics.avgWordsPerSentence > 22) {
    score -= 10;
    suggestions.push(
      suggestion(
        'read.sentences', 'readability', 'warning',
        'Sentences are long',
        `Your sentences average ${metrics.avgWordsPerSentence.toFixed(0)} words. Aim for 12 to 18. Splitting one long sentence in two is the fastest readability win there is.`,
      ),
    );
  }

  if (metrics.fillerWords.length >= 3) {
    score -= 8;
    suggestions.push(
      suggestion(
        'read.filler', 'readability', 'tip',
        `Cut ${metrics.fillerWords.length} filler words`,
        `Words such as ${metrics.fillerWords.slice(0, 4).join(', ')} can be deleted without changing your meaning.`,
      ),
    );
  }

  if (metrics.passiveHits.length >= 2) {
    score -= 6;
    suggestions.push(
      suggestion(
        'read.passive', 'readability', 'tip',
        'Prefer active voice',
        `Found ${metrics.passiveHits.length} passive constructions, for example "${metrics.passiveHits[0]}". Active voice is shorter and more direct.`,
      ),
    );
  }

  const jargon = JARGON_WORDS.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(metrics.firstLine));
  if (jargon.length > 0) {
    score -= 5;
    suggestions.push(
      suggestion(
        'read.jargon', 'readability', 'tip',
        'Drop the corporate jargon',
        `${jargon.join(', ')} reads as filler. Say the plain-English version instead.`,
      ),
    );
  }

  return { score: clamp(score, 0, 100), suggestions };
};

/* ------------------------------------------------------------ engagement -- */

const engagement: Scorer = ({ metrics, platform }) => {
  const suggestions: Suggestion[] = [];
  let score = 30;

  if (metrics.hasCta) {
    score += 40;
    suggestions.push(
      suggestion(
        'eng.cta', 'engagement', 'praise',
        'Has a clear call to action',
        metrics.ctaHits.length > 0
          ? `"${metrics.ctaHits[0]}" tells the reader exactly what to do next.`
          : 'Closing on a question tells the reader exactly what to do next.',
      ),
    );
  } else {
    suggestions.push(
      suggestion(
        'eng.nocta', 'engagement', 'critical',
        'No call to action',
        'Posts that ask for a specific response get meaningfully more comments. End with one clear ask.',
        'Try: "What would you add?" or "Save this for your next launch."',
      ),
    );
  }

  if (metrics.questions > 0) {
    score += 20;
    suggestions.push(
      suggestion(
        'eng.question', 'engagement', 'praise',
        'Asks the reader a question',
        'Questions invite replies, and replies are weighted heavily by every major feed algorithm.',
      ),
    );
  } else {
    suggestions.push(
      suggestion(
        'eng.noquestion', 'engagement', 'tip',
        'Try ending with a question',
        'A single open question at the end is the cheapest way to lift comment volume.',
      ),
    );
  }

  if (metrics.numbers > 0) {
    score += 10;
  } else {
    suggestions.push(
      suggestion(
        'eng.nonumbers', 'engagement', 'tip',
        'Add a concrete number',
        'Specifics outperform generalities. "Cut load time by 40%" beats "made it much faster".',
      ),
    );
  }

  if (platform.penalisesLinks && metrics.links.length > 0) {
    score -= 10;
    suggestions.push(
      suggestion(
        'eng.link', 'engagement', 'warning',
        'Outbound link may limit reach',
        `${platform.name} tends to show posts with outbound links to fewer people. Put the link in the first comment and say so in the post.`,
      ),
    );
  }

  return { score: clamp(score, 0, 100), suggestions };
};

/* ------------------------------------------------------- discoverability -- */

const GENERIC_TAGS = [
  '#love', '#instagood', '#photooftheday', '#follow', '#like4like',
  '#viral', '#trending', '#fyp', '#followme', '#picoftheday',
];

const discoverability: Scorer = ({ metrics, platform }) => {
  const suggestions: Suggestion[] = [];
  const count = metrics.hashtags.length;
  const [min, max] = platform.hashtags;
  const score = rangeScore(count, platform.hashtags, Math.max(3, max));

  if (count < min) {
    const missing = min - count;
    suggestions.push(
      suggestion(
        'tag.few', 'discoverability', 'warning',
        `Add ${missing} more hashtag${missing === 1 ? '' : 's'}`,
        `${platform.name} posts do best with ${min} to ${max} hashtags, and you have ${count}. Prefer specific tags over broad ones: #reactperformance beats #coding.`,
      ),
    );
  } else if (count > max) {
    suggestions.push(
      suggestion(
        'tag.many', 'discoverability', 'warning',
        `Too many hashtags for ${platform.name}`,
        `${count} hashtags reads as spam here, where ${min} to ${max} is the range that works. Keep the most specific ones.`,
      ),
    );
  } else if (count > 0) {
    suggestions.push(
      suggestion(
        'tag.good', 'discoverability', 'praise',
        'Good hashtag balance',
        `${count} hashtag${count === 1 ? '' : 's'} matches what works on ${platform.name}.`,
      ),
    );
  }

  const generic = metrics.hashtags.filter((tag) => GENERIC_TAGS.includes(tag.toLowerCase()));
  if (generic.length > 0) {
    suggestions.push(
      suggestion(
        'tag.generic', 'discoverability', 'tip',
        'Some hashtags are too broad',
        `${generic.join(', ')} are so crowded that your post disappears instantly. Niche tags reach fewer people, but the right ones.`,
      ),
    );
  }

  if (metrics.mentions.length === 0) {
    suggestions.push(
      suggestion(
        'tag.mention', 'discoverability', 'tip',
        'Consider tagging someone relevant',
        'Mentioning a person or brand can pull their audience into the conversation, when it is genuinely relevant.',
      ),
    );
  }

  return { score, suggestions };
};

/* ------------------------------------------------------------------ tone -- */

const tone: Scorer = ({ metrics }) => {
  const suggestions: Suggestion[] = [];
  // Mildly positive copy performs best; neutral is fine, strongly negative is not.
  let score = clamp(60 + metrics.sentiment * 40, 0, 100);

  if (metrics.sentiment > 0.25) {
    suggestions.push(
      suggestion(
        'tone.positive', 'tone', 'praise',
        'Positive, upbeat tone',
        'Positive posts get shared more often than neutral ones.',
      ),
    );
  } else if (metrics.sentiment < -0.25) {
    suggestions.push(
      suggestion(
        'tone.negative', 'tone', 'warning',
        'Tone reads as negative',
        `Words such as ${metrics.negativeHits.slice(0, 3).join(', ')} set a downbeat tone. Negativity can work as a hook, but end on what you would do instead.`,
      ),
    );
  }

  if (metrics.exclamations > 3) {
    score -= 15;
    suggestions.push(
      suggestion(
        'tone.excl', 'tone', 'warning',
        'Too many exclamation marks',
        `${metrics.exclamations} exclamation marks reads as shouting. One is usually enough.`,
      ),
    );
  }

  if (metrics.allCapsWords.length > 2) {
    score -= 10;
    suggestions.push(
      suggestion(
        'tone.caps', 'tone', 'warning',
        'Ease off the capitals',
        `${metrics.allCapsWords.slice(0, 3).join(', ')} in full caps reads as shouting. Use bold phrasing rather than bold formatting.`,
      ),
    );
  }

  const emojiCount = metrics.emojis.length;
  if (emojiCount === 0) {
    score -= 5;
    suggestions.push(
      suggestion(
        'tone.noemoji', 'tone', 'tip',
        'One or two emoji would help',
        'A small number of emoji break up the text and lift engagement. More than a handful has the opposite effect.',
      ),
    );
  } else if (emojiCount > 10) {
    score -= 10;
    suggestions.push(
      suggestion(
        'tone.manyemoji', 'tone', 'warning',
        'Too many emoji',
        `${emojiCount} emoji makes the post harder to read. Keep the two or three that carry meaning.`,
      ),
    );
  } else {
    suggestions.push(
      suggestion(
        'tone.emoji', 'tone', 'praise',
        'Good use of emoji',
        `${emojiCount} emoji adds warmth without becoming noise.`,
      ),
    );
  }

  return { score: clamp(score, 0, 100), suggestions };
};

/* ------------------------------------------------------------ formatting -- */

const formatting: Scorer = ({ metrics, platform }) => {
  const suggestions: Suggestion[] = [];
  let score = 70;

  const isWallOfText = metrics.characters > 400 && metrics.lineCount <= 2;

  if (platform.rewardsLineBreaks && isWallOfText) {
    score -= 30;
    suggestions.push(
      suggestion(
        'fmt.wall', 'formatting', 'warning',
        'Break up the wall of text',
        `${metrics.characters} characters in ${metrics.lineCount} line${metrics.lineCount === 1 ? '' : 's'} is hard to read on a phone. Use single-sentence paragraphs with blank lines between them.`,
      ),
    );
  } else if (platform.rewardsLineBreaks && metrics.paragraphs >= 3) {
    score += 20;
    suggestions.push(
      suggestion(
        'fmt.good', 'formatting', 'praise',
        'Well structured',
        `${metrics.paragraphs} short paragraphs make this easy to skim on mobile.`,
      ),
    );
  }

  const hasList = /^\s*(?:[-*•]|\d+[.)])\s/m.test(metrics.firstLine);
  if (metrics.characters > 600 && !hasList) {
    suggestions.push(
      suggestion(
        'fmt.list', 'formatting', 'tip',
        'A list would be easier to scan',
        'For longer posts, turning the middle section into three to five bullet points reliably improves read-through.',
      ),
    );
  }

  if (metrics.characters > 200 && metrics.sentences > 0 && metrics.avgWordsPerSentence < 8) {
    score += 10;
  }

  return { score: clamp(score, 0, 100), suggestions };
};

export const SCORERS: Record<Category, Scorer> = {
  hook,
  length,
  readability,
  engagement,
  discoverability,
  tone,
  formatting,
};

/** How much each category contributes to the headline score. Sums to 1. */
export const WEIGHTS: Record<Category, number> = {
  hook: 0.2,
  engagement: 0.2,
  length: 0.15,
  readability: 0.15,
  discoverability: 0.12,
  tone: 0.1,
  formatting: 0.08,
};

export const CATEGORY_LABELS: Record<Category, string> = {
  hook: 'Hook',
  engagement: 'Engagement',
  length: 'Length fit',
  readability: 'Readability',
  discoverability: 'Discoverability',
  tone: 'Tone',
  formatting: 'Formatting',
};
