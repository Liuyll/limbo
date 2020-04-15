import { useLayoutEffect } from '../hooks'

export function createContext(init) {
    const context = {
        value: init,
        Provider: function({ value,children }) {
            useLayoutEffect(() => {
                context.value = value
                context.updateSub()
            })
            return children
        },
        _subscribe: new Set(),
        addSub(fn) {
            this._subscribe.add(fn)
        },
        updateSub() {
            this._subscribe.forEach(sub => {
                sub(this.value)
            })
        },
        deleteSub(sub) {
            this._subscribe.delete(sub)
        }
    }
    return context
}