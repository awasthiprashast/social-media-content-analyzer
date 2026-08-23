import type { PlatformId } from '../types';

export interface PlatformProfile {
  id: PlatformId;
  name: string;
  /** Short label for the UI. */
  blurb: string;
  /** Hard limit enforced by the platform, in characters. */
  hardLimit: number;
  /** Range that tends to perform best, in characters. */
  sweetSpot: [number, number];
  /** Hashtag count that tends to perform best. */
  hashtags: [number, number];
  /** Characters visible before the post is truncated with a "more" link. */
  previewChars: number;
  /** Whether line breaks materially help scannability on this platform. */
  rewardsLineBreaks: boolean;
  /** Whether links in the body suppress reach. */
  penalisesLinks: boolean;
}

/**
 * Ranges are drawn from widely published engagement studies (Buffer, Hootsuite,
 * Sprout Social). They are rules of thumb, and the UI presents them that way.
 */
export const PLATFORMS: Record<PlatformId, PlatformProfile> = {
  twitter: {
    id: 'twitter',
    name: 'X / Twitter',
    blurb: 'Short, punchy, one idea per post',
    hardLimit: 280,
    sweetSpot: [71, 140],
    hashtags: [1, 2],
    previewChars: 280,
    rewardsLineBreaks: false,
    penalisesLinks: true,
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    blurb: 'Story-led, professional, hook before the fold',
    hardLimit: 3000,
    sweetSpot: [900, 1600],
    hashtags: [3, 5],
    previewChars: 210,
    rewardsLineBreaks: true,
    penalisesLinks: true,
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    blurb: 'Visual-first caption, hashtag discovery',
    hardLimit: 2200,
    sweetSpot: [138, 500],
    hashtags: [8, 15],
    previewChars: 125,
    rewardsLineBreaks: true,
    penalisesLinks: false,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    blurb: 'Conversational, short posts travel furthest',
    hardLimit: 63206,
    sweetSpot: [40, 250],
    hashtags: [0, 2],
    previewChars: 250,
    rewardsLineBreaks: true,
    penalisesLinks: false,
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);
