import heapq from '../helper/heapq'

let FRAME_LENGTH = 30
let NEXT_FRAME_LENGTH = FRAME_LENGTH
let ACTIVE_FRAME_LENGTH = FRAME_LENGTH

// heap
let taskQueue = []
let currentFrameDeadline = null
let currentTask = null
let breakSchedule = false

const getTime = () => performance.now()
export const SYNC       = 0x0000000001
export const ANY        = 0x0000000010

export function scheduleTask(cb, priority) {
    const startTime = getTime()
    const timeout = computedTimeout(priority)
    const newTask = {
        cb,
        startTime,
        deadline: startTime + timeout,
        priority
    }
    heapq.push(taskQueue,newTask,cmp)

    currentTask = schedule
    planWork()
}

function schedule(){
    let currentTask = heapq.top(taskQueue)
    while(currentTask) {
        if(currentTask.deadline > getTime() && shouldYield()) break
        currentTask = heapq.pop(taskQueue)

        let cb = currentTask.cb
        const doImmediately = currentTask.deadline <= getTime()
        const nextTask = cb(doImmediately)
        if(nextTask) {
            // inherit parent priority
            scheduleTask(nextTask, nextTask.priority)
        }
        currentTask = heapq.top(taskQueue)
    }

    return !!currentTask
}

export function ensureHighPriorityTaskToQueue(task) {
    cancelSchedule()
    heapq.push(taskQueue,task,cmp)
}

function cancelSchedule() {
    breakSchedule = true
}

function computedTime(rafTime) {
    const previousFrameDeadline = currentFrameDeadline
    // 下一帧截止时间: 剩余时间 + 固定帧长
    NEXT_FRAME_LENGTH = rafTime - previousFrameDeadline + ACTIVE_FRAME_LENGTH

    // 自适应固定帧长
    if(NEXT_FRAME_LENGTH < ACTIVE_FRAME_LENGTH && FRAME_LENGTH < ACTIVE_FRAME_LENGTH) {
        if(NEXT_FRAME_LENGTH < 8) NEXT_FRAME_LENGTH = 8
        else ACTIVE_FRAME_LENGTH = NEXT_FRAME_LENGTH > FRAME_LENGTH ? NEXT_FRAME_LENGTH : FRAME_LENGTH
    }
    FRAME_LENGTH = NEXT_FRAME_LENGTH

    currentFrameDeadline = rafTime + ACTIVE_FRAME_LENGTH
}

let RAFId, RAFTOId
function requestAnimationFrameWithTimeout(cb) {
    RAFId = requestAnimationFrame((timestamp) => {
        clearTimeout(RAFTOId)
        cb(timestamp)
    })
    RAFTOId = setTimeout(() => {
        cancelAnimationFrame(RAFId)
        cb(getTime())
    }, FRAME_LENGTH)
}
function tickWork() {
    let isTaskNotFinish = currentTask && currentTask()
    if(isTaskNotFinish) {
        planWork()
    } else (currentTask = null)
}

function computedTimeout(priority) {
    switch(priority) {
        case SYNC:
            return 0
        case ANY:
        default:
            return 1000 * 60 * 24
    }
}

export function shouldYield() {
    if(breakSchedule) {
        breakSchedule = false
        return true
    }
    return getTime() > currentFrameDeadline
}

export const planWork = (() => {
    return (cb) => {
        let _port1, _port2, work
        if(typeof MessageChannel !== 'undefined') {
            if(!_port1 && !_port2) {
                const { port1,port2 } = new MessageChannel()
                port1.onmessage = tickWork
                _port1 = port1
                _port2 = port2
            }
        }

        work = (timestamp) => {
            computedTime(timestamp)
            if(cb) cb(timestamp)
            else {
                if(_port2) _port2.postMessage(null)
                else setTimeout(tickWork)
            }
        }

        requestAnimationFrameWithTimeout(work)
    }
})()

// 小顶堆
function cmp(task1,task2) {
    return task1.deadline < task2.deadline
}