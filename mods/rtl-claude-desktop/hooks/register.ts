import type { Register } from 'claude-code'
import { fixRtl } from './rtl'

export const register: Register = (on) => {
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    const text = fixRtl(e.props.text)
    return text === e.props.text ? next(e) : next({ ...e, props: { ...e.props, text } })
  })
}
