import { useLayoutEffect,useContext } from '../hooks'
import { cloneElement } from '../h'

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
        Consumer: function({ children,selector }) {
            const value = useContext(context,selector)
            return cloneElement(children,{ value })
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