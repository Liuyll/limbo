let heapq = {}

let cmplt = function(x, y) {
    return x < y
}

heapq.push = function(heap, item, cmp) {
    heap.push(item)
    siftdown(heap, 0, heap.length - 1, cmp || cmplt)
}

heapq.pop = function(heap, cmp) {
    if (heap.length > 0) {
        let last = heap.pop()

        if (heap.length > 0) {
            let head = heap[0]
            heap[0] = last
            siftup(heap, 0, cmp || cmplt)
            return head
        } else {
            return last
        }
    }
}

heapq.top = function(heap) {
    if (heap.length !== 0)
        return heap[0]
}

heapq.pushpop = function(heap, item, cmp) {
    cmp = cmp || cmplt

    if (heap.length > 0 && cmp(heap[0], item)) {
        let temp = heap[0]
        heap[0] = item
        item = temp
        siftup(heap, 0, cmp)
    }
    return item
}

heapq.heapify = function(arr, cmp) {
    cmp = cmp || cmplt

    for (let idx = Math.floor(arr.length / 2) - 1; idx >= 0; --idx) siftup(arr, idx, cmp)
    return arr
}

heapq.heapsort = function(arr, cmp) {
    let heap = []

    for (let i = 0; i < arr.length; ++i)
        heapq.push(heap, arr[i], cmp)

    let arr_ = []

    while (heap.length > 0)
        arr_.push(heapq.pop(heap, cmp))
    return arr_
}

function siftdown(heap, startIdx, idx, cmp) {
    let item = heap[idx]

    while (idx > startIdx) {
        let parentIdx = (idx - 1) >> 1
        let parentItem = heap[parentIdx]
        if (cmp(item, parentItem)) {
            heap[idx] = parentItem
            idx = parentIdx
            continue
        }
        break
    }

    heap[idx] = item
}

function siftup(heap, idx, cmp) {
    let endIdx = heap.length
    let startIdx = idx
    let item = heap[idx]

    let childIdx = idx * 2 + 1

    while (childIdx < endIdx) {
        let rightIdx = childIdx + 1

        if (rightIdx < endIdx && (!cmp(heap[childIdx], heap[rightIdx]))) {
            childIdx = rightIdx
        }
        heap[idx] = heap[childIdx]
        idx = childIdx
        childIdx =  idx * 2 + 1
    }

    heap[idx] = item
    siftdown(heap, startIdx, idx, cmp)
}

module.exports = heapq
// export default heapq