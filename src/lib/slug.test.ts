import { describe, expect, it } from 'vitest'
import { createSlug } from './slug'

describe('createSlug', () => {
  it('normalizes names into lowercase URL slugs', () => {
    expect(createSlug('Ariel NOR AI')).toBe('ariel-nor-ai')
  })

  it('removes punctuation and collapses repeated separators', () => {
    expect(createSlug('  ACME, Inc. -- Panama!  ')).toBe('acme-inc-panama')
  })

  it('falls back when the name has no usable characters', () => {
    expect(createSlug('!!!', 'default-org')).toBe('default-org')
  })
})
