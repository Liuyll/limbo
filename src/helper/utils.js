export function remove(a,t) {
    for(let i = 0;i < a.length;i++) {
        if(a[i] === t) {
            a.splice(i,1)
            return i
        }
    }
    return -1
}

export function isPrimitive (value) {
    return (
        typeof value === 'string' ||
        typeof value === 'number' ||
        // $flow-disable-line
        typeof value === 'symbol' ||
        typeof value === 'boolean'
    )
}

export function isArray(t) {
    return Object.prototype.toString.call(t) === '[object Array]'
}

/**
 * create limbo inner error
 * shield limbo stack
 */
export function LimboError(err, ignore) {
    const error = new Error(err)

    Error.captureStackTrace(this, ignore)
    return error
}