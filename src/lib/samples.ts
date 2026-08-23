import type { PlatformId } from './types';

export interface Sample {
  label: string;
  platform: PlatformId;
  text: string;
}

/**
 * Two contrasting drafts, so the scoring is easy to sanity-check without
 * having a file to hand: one deliberately weak, one deliberately strong.
 */
export const SAMPLES: Sample[] = [
  {
    label: 'Weak draft',
    platform: 'linkedin',
    text: `It is with great pleasure that I am announcing that our team has been working very hard over the last several months in order to leverage our core competencies and deliver a best-in-class solution that we believe will move the needle for our valued customers going forward, and the product which has been built by our engineers is now being released to the general public today.`,
  },
  {
    label: 'Strong draft',
    platform: 'linkedin',
    text: `We cut our onboarding time from 14 days to 3.

Not by hiring. Not by buying a tool.

We deleted 9 of the 12 steps.

Here is what we learned:

→ Most "required" steps were required by nobody
→ Every handoff cost us a full day
→ The checklist existed to protect the process, not the customer

The hard part was not the redesign. It was admitting the old process was ours. 🙂

What is one step your team could delete this week?

#ProductOps #Onboarding #StartupLessons`,
  },
];
