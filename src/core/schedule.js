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

export function scheduleTask(cb) {
    let startTime = getTime()
    let timeout = 1000 * 60 * 24
    let newTask = {
        cb,
        startTime,
        deadline: startTime + timeout,
    }
    heapq.push(taskQueue,newTask,cmp)

    currentTask = beginWork
    planWork()
}

function beginWork(){
    let currentTask = heapq.top(taskQueue)
    while(currentTask) {
        if(currentTask.deadline < getTime() && shouldYield()) break
        let cb = currentTask.cb
        const canExecute = currentTask.deadline >= getTime()
        const isTaskSliceFinish = cb(canExecute)
        if(isTaskSliceFinish) currentTask.cb = isTaskSliceFinish
        else heapq.pop(taskQueue)

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
    NEXT_FRAME_LENGTH = rafTime - previousFrameDeadline + ACTIVE_FRAME_LENGTH
    
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

export function shouldYield() {
    if(breakSchedule) {
        breakSchedule = false
        return true
    }
    return getTime() > currentFrameDeadline    
}

export const planWork = (() => {
    const { port1,port2 } = new MessageChannel()
    port1.onmessage = tickWork
    return (cb) => {
        const work = (timestamp) => {
            computedTime(timestamp)

            // cb只处理hooks，不执行调度
            if(cb) cb(timestamp)
            else port2.postMessage(null) 
        }
        requestAnimationFrameWithTimeout(work)
    }
})()

// 小顶堆
function cmp(task1,task2) {
    return task1.deadline - task2.deadline
}