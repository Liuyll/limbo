import { remove } from '../helper/utils'
import { getComponentName } from '../helper/tools'
import { useState,useAction } from '../hooks'
const vnodeCache = new Map()

function matches (pattern,name){
    if (Array.isArray(pattern)) {
        return pattern.indexOf(name) > -1
    } else if (typeof pattern === 'string') {
        return pattern.split(',').indexOf(name) > -1
    } else if (Object.prototype.toString.call(pattern) === '[object RegExp]') {
        return pattern.test(name)
    }
    return false
}
  
function pruneCacheEntry(
    cache,
    keys,
    key
) {
    remove(keys,key)
    cache.set(key,null)
}

export default function KeepAlive(props) {
    const [keys,setKeys] = useState([])

    const { 
        children: vnode,
        max,
        include,
        exclude
    } = props

    const name = getComponentName(vnode)

    let noCache = false
    useAction(() => {
        if (
            (include && (!name || !matches(include, name))) ||
            (exclude && name && matches(exclude, name))
        ) {
            noCache = true
        }
    },[include,exclude,name])

    if(noCache) return vnode
    
    const key = vnode.key
    if(vnodeCache.get(key)) {
        vnode.node = vnodeCache.get(key)
        remove(keys,key)
        keys.push(key)
        setKeys(keys)
    } else {
        vnodeCache.set(key,vnode)
        keys.push(key)
        if(keys.length > max) {
            pruneCacheEntry(
                vnodeCache,
                keys,
                keys[0],
            )
        }
        setKeys(keys)
    }

    return vnode
}