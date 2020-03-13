import { 
    getClosetFiberFromNode,
    getTopLevelTypeFromNativeType,
} from './index'

import {
    SimpleEventPlugin
} from './plugins'

import {
    injectEventPluginOrder,
    DOMEventPluginOrder,
    injectEventPluginsByName
} from './registry'

const _hub__set = Symbol()
const _hub__map = Symbol()
const plugins = []

const bookKeepingPool = []
const pool_length = 10

export const enqueueListenTo = (() => {
    const listenSet = new Set()
    const listenMap = new Map()
    document[_hub__set] = listenSet
    document[_hub__map] = listenMap

    return (eventType) => {
        registeredEventType(eventType)
    }
})()

export function initEventSystem() {
    injectEventPluginOrder(DOMEventPluginOrder)
    injectEventPluginsByName({
        SimpleEventPlugin
    })
}

export function registeredEventType(type) {
    let rawTypeName = getTopLevelTypeFromNativeType(type)
    if(!document[_hub__set].has(type)) {
        document[_hub__set].add(type) 
    }
    
    document.addEventListener(getTopLevelTypeFromNativeType(type),dispatchEvent(rawTypeName))
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
        // 对于不同的事件,react抽象了几类pluginEvents
        // 这里只抽象一种plugin,其余的plugin异曲同工
        const events = runExtractedPluginEvents(topLevelType,ancestor,nativeEvent,eventTarget)
        batch(events)
    }
}

// 该函数用于生成合适的合成事件
function runExtractedPluginEvents(
    topLevelType,
    targetInst,
    nativeEvent,
    nativeEventTarget
) {
    let events = null
    for(const possiblePlugin of plugins) {
        const extractedEvents = possiblePlugin.extractedEvents(
            topLevelType,
            targetInst,
            nativeEvent,
            nativeEventTarget
        )

        if(extractedEvents) events = extractedEvents
    }

    return events
}


function batch(events) {
    for(let event of events) {
        executeDispatchesAndRelease(event)
    }
}

function executeDispatchesAndRelease(event) {
    executeDispatchesInOrder(event)

    // 如果没有调用persist()方法则直接回收
    if (!event.isPersistent()) {
        event.release(event)
    }
}

function executeDispatchesInOrder(event) {
    // 获取绑定在该类型事件上的全部回调函数

    const dispatchListeners = event._dispatchListeners
    const dispatchInstances = event._dispatchInstances

    if(dispatchListeners.pop) {
        for(let i = 0;i < dispatchListeners.length; i++) {
            const curListener = dispatchListeners[i]
            event.currentTarget = dispatchInstances[i].node
            curListener(event)
            if(event.isPropagationStopped()) break
        }
    } else {
        event.currentTarget = dispatchInstances
        dispatchListeners(event)
    }

    event._dispatchListeners = null
    event._dispatchInstances = null
}