import { isFn } from './helper/tools'
// import { enqueueListenTo } from './events'

export function updateElement(fiber,shouldExecuteEffect = true) {
    const { oldProps = {},props: newProps } = fiber
    const element = fiber.node

    for(const prop in { ...oldProps,...newProps }) {
        const oldProp = oldProps[prop]
        const newProp = newProps[prop]

        if(oldProps === newProp || prop === 'children') return
        if(prop === 'style') {
            const newStyles = newProp
            const oldStyles = oldProp

            // 浏览器批量重置属性以优化reflow
            // 所以这里无需做新旧对比
            for(let style in Object.assign(oldStyles,newStyles)) {
                element.style[style] = newStyles[style] || ''
            } 
        } else if(prop.substring(0,2) == 'on') {
            if(shouldExecuteEffect) {
                const registerEventName = prop[2].toLowerCase() + prop.substring(3)
                if(!newProps[prop]) element.removeEventListener(registerEventName, oldProps[prop])
                else if(!oldProps[prop]) element.addEventListener(registerEventName, newProps[prop])
                else if(oldProps[prop] && newProps[prop]) {
                    if(oldProps[prop] !== newProps[prop]) {
                        element.removeEventListener(registerEventName, oldProps[prop])
                        element.addEventListener(registerEventName, newProps[prop])
                    }
                }
                // eslint-disable-next-line
                // if(globalThis.eventDev) enqueueListenTo(registerEventName,fiber,newProps[prop])
                // else element.addEventListener(registerEventName,newProp)
            }
        } else if(prop === 'key') { //
        } else if(newProps[prop] === false || newProps[prop] == null) {
            element.removeAttribute(prop)
        } else {
            element.setAttribute(prop,newProps[prop])
        } 

    }    
}

export function setTextContent(fiber,value) {
    fiber.node.textContent = value
}

export function mountElement(fiber) {
    if(isFn(fiber.type)) throw new Error('vnode is not Element Type')
    const dom = 
            fiber.type === 'text' 
                ? document.createTextNode(fiber.value)
                : document.createElement(fiber.type)
    
    // 反向引用
    fiber.node = dom
    dom._limbo__fiber = fiber
    updateElement(fiber,true)
    return dom
}


