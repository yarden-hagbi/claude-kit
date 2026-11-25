const HEBREW = /[֐-׿]/
const RLM = '‏'
// Leading markdown that must stay first on the line: indent, quote, heading, list marker.
const LEAD = /^(\s*(?:>\s*)*(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)?)/

// Marks each Hebrew-bearing line (outside code fences) with a right-to-left mark,
// so a line that opens with an English word or a number still reads right to left.
export function fixRtl(text: string): string {
  if (!HEBREW.test(text)) return text
  let inFence = false
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence
        return line
      }
      if (inFence || !HEBREW.test(line) || line.includes(RLM)) return line
      if (/^\s*\|/.test(line)) return line.replace(/\|([^|]*)/g, (m, cell: string) => (HEBREW.test(cell) ? `|${RLM}${cell}` : m))
      const lead = LEAD.exec(line)?.[1] ?? ''
      return lead + RLM + line.slice(lead.length)
    })
    .join('\n')
}
