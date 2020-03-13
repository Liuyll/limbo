import { accumulateTwoPhaseDispatches } from './event'

const DiscreteEvent = 0

const EventInterface = {
    type: null,
    target: null,
    currentTarget: null,
    bubbles: null,
    cancelable: null,
    defaultPrevented: null,
}

export function publishRegistrationName() {

}
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
// limbo只支持chrome,不做兼容实现,但保留对应接口
function SyntheticEvent(
    eventInfo,
    targetInst,
    nativeEvent,
    // nativeEventTarget
) {
    this.targetInst = targetInst
    this.eventInfo = eventInfo
    this.nativeEvent = nativeEvent

    for(let propName of EventInterface) {
        // const nativeEventProps = EventInterface[propName]
        this[propName] = nativeEvent[propName]
    }

    const defaultPrevented = nativeEvent.defaultPrevented != null 
        ? nativeEvent.defaultPrevented
        : nativeEvent.returnValue === false

    defaultPrevented ? this.isDefaultPrevented = () => true : this.isDefaultPrevented = () => false
    this.isStopPropagation = () => false

    return this
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

// 只实现几个代表,其他异曲同工
Object.assign(SyntheticEvent.prototype, {
    stopPropagation: function() {
        const nativeEvent = this.nativeEvent
        
        // 兼容不同环境
        if(nativeEvent.stopPropagation) {
            nativeEvent.stopPropagation()
        } else if(nativeEvent.cancelBubble !== 'unknown') {
            nativeEvent.cancelBubble = true
        }
        
        this.isStopPropagation = () => true
    },
    destructor: function() {
        // 保留接口
    }
})

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

