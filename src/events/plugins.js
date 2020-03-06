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
    return EventConstructor.getPooled(
        targetInst,
        nativeEvent,
        nativeEventTarget
    )
}

function SyntheticMouseEvent() {
    
}

function SyntheticEvent() {
    
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
    return Class
}

