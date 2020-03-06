import { 
    getClosetFiberFromNode
} from './events'

const _hub__set = Symbol()
const _hub__map = Symbol()

const TOP_CLICK = 0
// const TOP_BLUR = 1

const bookKeepingPool = []
const pool_length = 10

export const enqueueListenTo = (() => {
    const listenSet = new Set()
    const listenMap = new Map()
    document[_hub__set] = listenSet
    document[_hub__map] = listenMap

    return (eventType,fiber,handler) => {
        if(!listenSet.has(eventType)) { 
            listenSet.add(eventType)
            listenMap.set(eventType,new Map())
        }

        const currentEventHub = listenMap.get(eventType)
        currentEventHub.set(fiber,handler)
    }
})()

export function initEventPluginSystem() {

}

export function registeredEventType(type) {
    let rawTypeName
    if(!document[_hub__set].has(type)) {
        switch(type) {
        case TOP_CLICK: {
            rawTypeName = 'click'
            document.addEventListener(rawTypeName,dispatchEvent(TOP_CLICK))
            break
        } 
        }
        document[_hub__set].add(type) 
    }
}

// nativeEvent由浏览器传入
// 这里也可采用curry 
// 但为阅读方便,不做对react源码风格上的变化
function dispatchEvent(topLevelType,nativeEvent) {
    const targetInst = nativeEvent.target
    const bookKeeping = getBookKeeping(topLevelType,nativeEvent,targetInst)
    try {
        handleTopLevel(bookKeeping)
    } finally {
        bookKeeping.release()
    }
    
}

function getBookKeeping(topLevelType,nativeEvent,targetInst) {
    if(!bookKeepingPool.length) {
        return newBookKeeping()
    }
    else {
        let curBookKeeping = bookKeepingPool.pop()
        curBookKeeping.topLevelType = topLevelType
        curBookKeeping.targetInst = targetInst
        curBookKeeping.nativeEvent = nativeEvent

        // 暂时不实现优先级事件系统插件
        // eventSystemPluginFlag只做占位
    }

    function newBookKeeping() {
        return {
            targetInst: null,
            topLevelType: null,
            eventSystemPluginFlag: null,
            nativeEvent: null,
            ancestors: [],
            release() {
                this.targetInst = null
                this.topLevelType = null 
                this.eventSystemPluginFlag = null
                this.nativeEvent = null
                this.ancestors = []

                if(bookKeepingPool.length < pool_length) {    
                    bookKeepingPool.push(this)
                }
            }
        }
    }
}

function handleTopLevel(bookKeeping) {
    let ancestor = bookKeeping.targetInst
    const ancestors = bookKeeping.ancestors
    if(ancestor) ancestors.push(ancestor)

    const eventTarget = bookKeeping.nativeEvent.target
    const nativeEvent = bookKeeping.nativeEvent
    const topLevelType = bookKeeping.topLevelType

    do {
        if(!ancestor) break
        
        const fiber = ancestor._limbo__fiber
        const root = getClosetFiberFromNode(fiber)
        ancestors.push(root.node)
        ancestor = getClosetFiberFromNode(root)
    } while(ancestor)

    // 冒泡
    for(const ancestor of ancestors) {

        // 这里是最后的核心,暂时不实现它
        // 对于不同的事件,react抽象了几类pluginEvents
        // 非常感兴趣可以看源码
        runExtractedPluginEvents(
            topLevelType,
            ancestor,
            nativeEvent,
            eventTarget
        )
    }
}

function runExtractedPluginEvents() {

}