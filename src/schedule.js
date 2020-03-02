import heapq from './heapq'

const fluency_frame_count = 60
const frame_length = 1000 / fluency_frame_count

// heap
let taskQueue = []
let current_frame_deadline = null
let current_callback = null

const getTime = () => performance.now()

export function scheduleCallback(cb) {
    let startTime = getTime()
    let timeout = 1000 * 60 * 24
    let newTask = {
        cb,
        startTime,
        // 为后续优先级添加截止时间,实际上是无限
        dueTime: startTime + timeout,
    }
    heapq.push(taskQueue,newTask,cmp)
    // 初始任务为启动轮询
    current_callback = polling
}

function polling(){
    let currentTask = heapq.top(taskQueue)
    while(currentTask) {
        // 超过截止时间并且该帧可用时间已经结束
        if(currentTask.dueTime < getTime() && shouldYield()) break
        let cb = currentTask.cb
        const canExecute = currentTask.dueTime >= getTime()
        // 标识任务是否执行完
        const isTaskSliceFinish = cb(canExecute)
        if(isTaskSliceFinish) currentTask.cb = isTaskSliceFinish

        currentTask = heapq.top(taskQueue)
    }

    // 任务是否执行完
    return !!currentTask
}   

function beforePolling() {
    current_frame_deadline = getTime() + frame_length
    let isTaskNotFinish = current_callback()
    if(isTaskNotFinish) {
        // eslint-disable-next-line
        planWork()
    } else (current_callback = null)
}

// 超过当前帧则延缓任务,否则继续执行
export function shouldYield() {
    return getTime() > current_frame_deadline    
}

// MessageChannel 实现macro task
// 具体原因参考react issue
// 不做setTimeout回退
export const planWork = (() => {
    const { port1,port2 } = new MessageChannel()
    port1.onmessage = beforePolling
    return (cb) => cb && requestAnimationFrame(cb) || port2.postMessage(null)
})()

// heap 小顶堆
function cmp(task1,task2) {
    return task1.dueTime - task2.dueTime
}