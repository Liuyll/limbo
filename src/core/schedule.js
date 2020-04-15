import heapq from '../helper/heapq'

const fluency_frame_count = 60
const frame_length = 1000 / fluency_frame_count

// heap
let taskQueue = []
let current_frame_deadline = null
let current_task = null
let break_schedule = false

const getTime = () => performance.now()

export function scheduleTask(cb) {
    let startTime = getTime()
    let timeout = 1000 * 60 * 24
    let newTask = {
        cb,
        startTime,
        // 为后续优先级添加截止时间
        // 注意,这里并非idle priority ,而是sync priority
        // 无限长过期时间只是为了标识
        expiration: startTime + timeout,
    }
    heapq.push(taskQueue,newTask,cmp)
    // 初始任务为启动轮询
    current_task = beginWork
    // eslint-disable-next-line
    planWork()
}

// re-render level task
function beginWork(){
    let currentTask = heapq.top(taskQueue)
    while(currentTask) {
        // 超过截止时间并且该帧可用时间已经结束
        if(currentTask.expiration < getTime() && shouldYield()) break
        let cb = currentTask.cb
        const canExecute = currentTask.expiration >= getTime()
        // 标识任务是否执行完
        const isTaskSliceFinish = cb(canExecute)
        if(isTaskSliceFinish) currentTask.cb = isTaskSliceFinish

        currentTask = heapq.top(taskQueue)
    }

    // 任务是否执行完
    return !!currentTask
}   

export function ensureHighPriorityTaskToQueue(task) {
    cancelSchedule()
    heapq.push(taskQueue,task,cmp)
}

function cancelSchedule() {
    break_schedule = true
}

function startOrRecoverWork() {
    current_frame_deadline = getTime() + frame_length

    // 若beginWork未执行完毕,将会恢复执行
    let isTaskNotFinish = current_task()
    if(isTaskNotFinish) {
        // eslint-disable-next-line
        planWork()
    } else (current_task = null)
}

// 超过当前帧则延缓任务,否则继续执行
export function shouldYield() {
    if(break_schedule) {
        break_schedule = false
        return true
    }
    return getTime() > current_frame_deadline    
}

// MessageChannel 实现macro task
// 具体原因参考react issue
// 不做setTimeout回退
export const planWork = (() => {
    const { port1,port2 } = new MessageChannel()
    port1.onmessage = startOrRecoverWork
    return (cb) => cb && requestAnimationFrame(cb) || port2.postMessage(null)
})()

// heap 小顶堆
function cmp(task1,task2) {
    return task1.expiration - task2.expiration
}