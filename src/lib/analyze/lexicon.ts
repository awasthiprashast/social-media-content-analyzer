/**
 * Word lists backing the heuristic analysis. They are deliberately small and
 * hand-picked: the goal is explainable, deterministic feedback, not a
 * statistical model. Every entry is lowercase and matched on word boundaries.
 */

/** Phrases that ask the reader to do something. */
export const CTA_PATTERNS: RegExp[] = [
  /\b(comment|reply|respond)\b[^.!?]{0,30}\b(below|here|thoughts?)\b/i,
  /\b(let me know|tell me|what do you think|thoughts\?|agree\?)/i,
  /\b(share|repost|retweet|tag)\b[^.!?]{0,25}\b(this|it|a friend|someone|your)\b/i,
  /\b(sign up|subscribe|register|join|download|book a|get started|try it|apply now)\b/i,
  /\b(learn more|read more|find out|check (it |this )?out|see how|link in bio|swipe up)\b/i,
  /\b(follow (me|us)|dm (me|us)|drop a|hit (the )?(like|follow))\b/i,
  /\b(save this|bookmark this|share if)\b/i,
  // A question aimed at the reader is the most common CTA on social, and it
  // rarely uses any of the imperative phrasings above.
  /\b(what|which|how|who|when|why)\b[^?]{0,100}\b(you|your|we|our|team)\b[^?]{0,80}\?/i,
];

/** Openers that reliably stop the scroll. */
export const HOOK_PATTERNS: RegExp[] = [
  /^\s*\d+\s+(ways|things|reasons|lessons|steps|mistakes|tips|rules)/i,
  /^\s*(how|why|what|when|where|who)\b/i,
  /^\s*(stop|start|never|always|forget|unpopular opinion|hot take)\b/i,
  /^[^.!?\n]{0,80}\?/,
  /^\s*i (spent|built|made|lost|quit|learned|tried|failed)/i,
  /^\s*(here'?s|this is) (why|how|what)/i,
  // A concrete number in the opening line: "We cut onboarding from 14 days to 3."
  /^[^\n]*\b\d[\d,.]*\b/,
];

export const POWER_WORDS = [
  'proven', 'free', 'instantly', 'secret', 'exclusive', 'guaranteed', 'essential',
  'ultimate', 'surprising', 'effortless', 'breakthrough', 'powerful', 'simple',
  'unexpected', 'critical', 'remarkable', 'urgent', 'limited', 'new', 'discover',
  'transform', 'boost', 'unlock', 'avoid', 'mistake', 'without', 'actually',
];

/** Words that add length without adding meaning. */
export const FILLER_WORDS = [
  'very', 'really', 'just', 'quite', 'actually', 'basically', 'literally',
  'simply', 'totally', 'definitely', 'certainly', 'perhaps', 'maybe', 'somewhat',
  'kind of', 'sort of', 'in order to', 'due to the fact', 'at this point in time',
  'needless to say', 'it is important to note',
];

/** Corporate phrasing that reads as noise on social platforms. */
export const JARGON_WORDS = [
  'synergy', 'leverage', 'paradigm', 'ecosystem', 'holistic', 'disruptive',
  'best-in-class', 'thought leader', 'circle back', 'move the needle',
  'low-hanging fruit', 'value-add', 'utilize', 'ideate', 'operationalize',
  'bandwidth', 'deep dive', 'touch base', 'going forward',
];

export const POSITIVE_WORDS = [
  'love', 'great', 'excellent', 'amazing', 'best', 'happy', 'excited', 'proud',
  'win', 'wins', 'success', 'successful', 'grateful', 'thrilled', 'brilliant',
  'helpful', 'improve', 'improved', 'growth', 'strong', 'wonderful', 'perfect',
  'awesome', 'celebrate', 'achievement', 'inspiring', 'delighted', 'good',
  'better', 'gain', 'opportunity', 'boost', 'enjoy', 'recommend', 'favourite',
  'favorite', 'beautiful', 'fantastic', 'incredible', 'congratulations',
];

export const NEGATIVE_WORDS = [
  'hate', 'bad', 'worst', 'terrible', 'awful', 'sad', 'angry', 'fail', 'failed',
  'failure', 'problem', 'issue', 'broken', 'difficult', 'hard', 'struggle',
  'struggling', 'disappointed', 'frustrating', 'frustrated', 'wrong', 'loss',
  'lost', 'poor', 'weak', 'boring', 'confusing', 'painful', 'mistake', 'risk',
  'crisis', 'decline', 'unfortunately', 'sorry', 'never', 'nothing', 'worse',
];

/**
 * Intensity modifiers. Sentiment is scored as a sum of hits, so these let
 * "not good" and "very good" land differently from a bare "good".
 */
export const NEGATORS = ['not', "don't", 'dont', 'no', 'never', 'without', "isn't", 'isnt', "wasn't", 'cannot', "can't"];

export const INTENSIFIERS = ['very', 'extremely', 'incredibly', 'so', 'really', 'absolutely', 'totally'];

/** Common irregular syllable counts the heuristic gets wrong. */
export const SYLLABLE_EXCEPTIONS: Record<string, number> = {
  business: 2, every: 2, different: 3, people: 2, area: 3, idea: 3, being: 2,
  simile: 3, forever: 3, shoreline: 2, evening: 2, average: 3, camera: 3,
};
