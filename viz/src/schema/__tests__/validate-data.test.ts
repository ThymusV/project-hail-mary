import { describe, it, expect } from 'vitest';
import { TimelineDataSchema, validateTimeline } from '../timeline.schema';
import data from '../../data/timeline.json';

describe('timeline.json data validation', () => {
  it('passes full Zod schema validation', () => {
    const result = TimelineDataSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues.slice(0, 20)) {
        console.log(JSON.stringify({ path: issue.path.join('.'), code: issue.code, msg: issue.message }));
      }
      expect.fail(`Validation failed with ${result.error.issues.length} issues (see above)`);
    }
    expect(result.data.events.length).toBeGreaterThanOrEqual(80);
    expect(result.data.segments.length).toBeGreaterThanOrEqual(10);
    expect(result.data.scenes.length).toBe(7);
    expect(result.data.cameraShots.length).toBeGreaterThanOrEqual(5);
  });
});
