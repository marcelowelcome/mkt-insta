import { describe, it, expect } from 'vitest'
import { extractJSON, validateCampaignSchema } from '@/lib/campaign/campaign-parser'

describe('extractJSON', () => {
  it('extracts valid JSON from clean text', () => {
    const input = '{"campaign_summary":"test","strategic_rationale":"r","format_strategy":"f","timing_strategy":"t","expected_results":"e","posts":[{"post_order":1,"format":"REEL","caption":"Hello","hashtags":["test"],"cta":"Save","visual_brief":"desc"}]}'
    const result = extractJSON(input)
    expect(result.campaign_summary).toBe('test')
    expect(result.posts).toHaveLength(1)
    expect(result.posts[0].format).toBe('REEL')
  })

  it('extracts JSON from markdown fences', () => {
    const input = '```json\n{"campaign_summary":"test","strategic_rationale":"","format_strategy":"","timing_strategy":"","expected_results":"","posts":[{"post_order":1,"format":"IMAGE","caption":"Cap","hashtags":[],"cta":"","visual_brief":""}]}\n```'
    const result = extractJSON(input)
    expect(result.campaign_summary).toBe('test')
  })

  it('extracts JSON with text before/after', () => {
    const input = 'Here is the result:\n{"campaign_summary":"s","strategic_rationale":"","format_strategy":"","timing_strategy":"","expected_results":"","posts":[{"post_order":1,"format":"CAROUSEL","caption":"C","hashtags":["h"],"cta":"","visual_brief":""}]}\nDone!'
    const result = extractJSON(input)
    expect(result.posts[0].format).toBe('CAROUSEL')
  })

  it('throws on invalid JSON', () => {
    expect(() => extractJSON('not json')).toThrow()
  })

  it('throws on empty posts', () => {
    expect(() => extractJSON('{"campaign_summary":"","posts":[]}')).toThrow('at least one post')
  })
})

describe('validateCampaignSchema', () => {
  const validPost = {
    post_order: 1,
    format: 'REEL',
    caption: 'Test caption',
    hashtags: ['#test', 'travel'],
    cta: 'Save',
    visual_brief: 'A beautiful scene',
  }

  it('validates a complete campaign', () => {
    const result = validateCampaignSchema({
      campaign_summary: 'Summary',
      strategic_rationale: 'Rationale',
      format_strategy: 'Formats',
      timing_strategy: 'Timing',
      expected_results: 'Results',
      posts: [validPost],
    })
    expect(result.campaign_summary).toBe('Summary')
    expect(result.posts).toHaveLength(1)
    expect(result.posts[0].hashtags).toEqual(['test', 'travel'])
  })

  it('strips # from hashtags', () => {
    const result = validateCampaignSchema({
      posts: [{ ...validPost, hashtags: ['#beach', '#wedding', 'love'] }],
    })
    expect(result.posts[0].hashtags).toEqual(['beach', 'wedding', 'love'])
  })

  it('normalizes format to uppercase', () => {
    const result = validateCampaignSchema({
      posts: [{ ...validPost, format: 'reel' }],
    })
    expect(result.posts[0].format).toBe('REEL')
  })

  it('rejects invalid format', () => {
    expect(() =>
      validateCampaignSchema({
        posts: [{ ...validPost, format: 'TIKTOK' }],
      })
    ).toThrow('invalid format')
  })

  it('rejects missing caption', () => {
    expect(() =>
      validateCampaignSchema({
        posts: [{ ...validPost, caption: '' }],
      })
    ).toThrow('caption is required')
  })

  it('includes reel fields only for reels', () => {
    const result = validateCampaignSchema({
      posts: [
        { ...validPost, format: 'REEL', reel_concept: 'Concept', reel_duration: '30s' },
        { ...validPost, post_order: 2, format: 'IMAGE', reel_concept: 'Should be ignored' },
      ],
    })
    expect(result.posts[0].reel_concept).toBe('Concept')
    expect(result.posts[1].reel_concept).toBeUndefined()
  })

  it('includes slides only for carousels', () => {
    const result = validateCampaignSchema({
      posts: [
        { ...validPost, format: 'CAROUSEL', slides: [{ slide: 1, content: 'Slide 1' }] },
      ],
    })
    expect(result.posts[0].slides).toHaveLength(1)
  })
})
