import { useLayoutEffect, useContext, useAction } from '../hooks'
import { cloneElement } from '../h'

export function createContext(init) {
    const context = {
        value: init,
        _subscribe: new Set(),
        Provider: function({ value,children }) {
            useAction(() => {
                context.value = value
            }, [value])
            useLayoutEffect(() => {
                context.updateSub()
            }, [value])
            return children
        },
        Consumer: function({ children,selector }) {
            const value = useContext(context,selector)
            return cloneElement(children,{ value })
        },
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