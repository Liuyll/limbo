import { accumulateTwoPhaseDispatches } from './event'

const DiscreteEvent = 0

export const DOMTopLevelEventTypes = {
    'TOP_CLICK': ['click',DiscreteEvent]
}

export function getTopLevelTypeFromNativeType(type) {
    for(let key of Object.keys(DOMTopLevelEventTypes)) {
        if(DOMTopLevelEventTypes[key] && DOMTopLevelEventTypes[key][0] === type) return key
    }
    return null
}

export const SimpleEventPlugin = function (
    topLevelType,
    targetInst,
    nativeEvent,
    nativeEventTarget
) {
    let EventConstructor = null
    switch(topLevelType) {
        case DOMTopLevelEventTypes.TOP_CLICK: {
            EventConstructor = SyntheticMouseEvent
            break
        }
    }
    const event = EventConstructor.getPooled(
        targetInst,
        nativeEvent,
        nativeEventTarget
    )

    accumulateTwoPhaseDispatches(event)
    return event
}

function SyntheticMouseEvent() {
    return SyntheticEvent.extend({})
}


// 抹平不同浏览器之间api差异
// limbo只支持chrome,不做实现,但保留接口
function SyntheticEvent(
    eventInfo,
    targetInst,
    nativeEvent,
    nativeEventTarget
) {
    this.targetInst = targetInst
    this.eventInfo = eventInfo
    this.nativeEvent = nativeEvent

    const defaultPrevented = nativeEvent.defaultPrevented != null 
        ? nativeEvent.defaultPrevented
        : nativeEvent.returnValue === false 
}

function getPool(
    eventInfo,
    targetInst,
    nativeEvent,
    nativeEventTarget
) {
    const EventConstructor = this
    if(EventConstructor.eventPool.length) {
        const instance = EventConstructor.eventPool.pop()
        EventConstructor.call(
            instance,
            eventInfo,
            targetInst,
            nativeEvent,
            nativeEventTarget
        )
        return instance
    } else {
        return new EventConstructor(
            eventInfo,
            targetInst,
            nativeEvent,
            nativeEventTarget
        )
    }
}

SyntheticEvent.extend = function(Interface) {
    const Super = this

    function Class() {
        Super.apply(this,arguments)
    }

    Object.setPrototypeOf(Class.prototype,Super.prototype)
    Class.prototype.constructor = Class 
    Class.Interface = { ...Super.Interface,...Interface }
    Class.extend = Super.extend

    // add eventPool
    Class.eventPool = []
    Class.getPool = getPool

    return Class
}

