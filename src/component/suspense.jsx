import { h } from '../h'
// TODO: JSX格式
function Suspense({ children }) {
    return h('div', { __suspense_container: true, class: '__limbo_suspense_container' }, children)
}

export {
    Suspense
}

