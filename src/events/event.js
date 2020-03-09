import { getParentElementFiber } from '../fiber'

export function accumulateTwoPhaseDispatches(syntheticEvents) {
    syntheticEvents.forEach(event => {
        traverseTwoPhase(event._targetInst,accumulateListener,event)
    })
}

export function accumulateListener (inst,type,event) {
    const registrationEventName = event.eventInfo
    const listener = getListener(inst,registrationEventName)
    if(listener) {
        event._dispatchListeners = accumulateInto(
            event._dispatchListeners,
            listener
        )
    }
    
    event._dispatchInstances = accumulateInto(
        event._dispatchInstances,
        inst
    )
}

function accumulateInto(before,cur) {
    if(before == null) return cur
    if(before.pop && cur.pop) {
        before.push(...cur)
    } else if(before.pop) {
        before.push(cur)
    } else if(cur.pop) {
        before = [before]
        before.push(...cur)
    }

    return before
}
function getListener(fiber,eventName) {
    let listener 
    const props = fiber.props
    listener = props[eventName]
    return listener
}

export function traverseTwoPhase(
    inst,
    fn,
    syntheticEvent
){
    const path = []
    while(inst) {
        path.push(inst)
        inst = getParentElementFiber(inst)
    }

    // capture
    for(let i = path.length; i > 0;i-- ) {
        fn(path[i],'capture',syntheticEvent)
    }

    // bubble
    for(let i = 0; i < path.length;i++ ) {
        fn(path[i],'bubble',syntheticEvent)
    }

}