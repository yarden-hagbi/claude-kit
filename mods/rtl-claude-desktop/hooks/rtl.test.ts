import { expect, test } from 'claude-code/testing'
import { fixRtl } from './rtl'

const R = '‏'

test('English-only text is left alone', async () => {
  const text = 'Hello **world**\n- item'
  expect(fixRtl(text)).toBe(text)
})

test('Hebrew lines get a mark after their markdown lead', async () => {
  expect(fixRtl('Claude Code הוא כלי\n- PR חדש\n## Git בעברית\nplain English'))
    .toBe(`${R}Claude Code הוא כלי\n- ${R}PR חדש\n## ${R}Git בעברית\nplain English`)
})

test('code fences are untouched, table cells are marked', async () => {
  expect(fixRtl('```\nשלום\n```\n| a | שם |'))
    .toBe(`\`\`\`\nשלום\n\`\`\`\n| a |${R} שם |`)
})

test('already-marked text is not marked twice', async () => {
  const once = fixRtl('שלום world')
  expect(fixRtl(once)).toBe(once)
})
