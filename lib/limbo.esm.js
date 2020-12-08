(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('shallowequal')) :
    typeof define === 'function' && define.amd ? define(['exports', 'shallowequal'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.limbo = {}, global.shallowEqual));
}(this, (function (exports, shallowEqual) { 'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var shallowEqual__default = /*#__PURE__*/_interopDefaultLegacy(shallowEqual);

    let current_fiber = null;
    const HostFiber = 0;
    const Hook = 1;

    function createFiber(vnode,op) {
        return { ...vnode,tag: typeof vnode.type === 'function' ? Hook : HostFiber,effect: op }
    }

    function getParentElementFiber(fiber) {
        if(!fiber.parent) return null
        fiber = fiber.parent;
        while(fiber && fiber.tag === Hook) {
            fiber = fiber.parent;
        }
        return fiber
    }

    function getCurrentFiber() {
        return current_fiber
    }

    function setCurrentFiber(fiber) {
        current_fiber = fiber;
    }

    function isPrimitive (value) {
        return (
            typeof value === 'string' ||
            typeof value === 'number' ||
            // $flow-disable-line
            typeof value === 'symbol' ||
            typeof value === 'boolean'
        )
    }

    function isArray(t) {
        return Object.prototype.toString.call(t) === '[object Array]'
    }

    const __LIMBO_COMPONENT = Symbol('vnode');
    function h(type,data,...children) {
        // 兼容ts-loader和babel-jsx-transform的不同
        if(!data) data = {};

        let { 
            key = null,
            ref = null,
            name = null,
            ...props
        } = data;

        if(name) type.name = name;
        children = normalizeChildren(children);

        if(children.length) props.children = children.length === 1 ? children[0] : children;
        if(children.type === 'text') props.children = children;

        return {
            __type: __LIMBO_COMPONENT,
            key,
            ref,
            props,
            type
        }
    }

    function createTextNode(text) {
        return {
            type: 'text',
            value: text,
            props: {},
            tag: HostFiber
        }
    }

    // 若使用 jsx-babel 无需下面两个函数
    function normalizeChildren(c) {
        if(isPrimitive(c)) return createTextNode(c)
        else if(isArray(c)) {
            return flattenArray(c).map(sc => {
                return normalizeChildren(sc)
            })
        }
        else return c || []
    }

    function flattenArray(t) {
        return Array.prototype.concat.apply([],t)
    }

    let heapq = {};

    let cmplt = function(x, y) {
        return x < y
    };

    heapq.push = function(heap, item, cmp) {
        heap.push(item);
        siftdown(heap, 0, heap.length - 1, cmp || cmplt);
    };

    heapq.pop = function(heap, cmp) {
        if (heap.length > 0) {
            let last = heap.pop();

            if (heap.length > 0) {
                let head = heap[0];
                heap[0] = last;
                siftup(heap, 0, cmp || cmplt);
                return head
            } else {
                return last
            }
        }
    };

    heapq.top = function(heap) {
        if (heap.length !== 0)
            return heap[0]
    };

    heapq.pushpop = function(heap, item, cmp) {
        cmp = cmp || cmplt;

        if (heap.length > 0 && cmp(heap[0], item)) {
            let temp = heap[0];
            heap[0] = item;
            item = temp;
            siftup(heap, 0, cmp);
        }
        return item
    };

    heapq.heapify = function(arr, cmp) {
        cmp = cmp || cmplt;

        for (let idx = Math.floor(arr.length / 2) - 1;
            idx >= 0; --idx)
            siftup(arr, idx, cmp);
        return arr
    };

    heapq.heapsort = function(arr, cmp) {
        let heap = [];

        for (let i = 0; i < arr.length; ++i)
            heapq.push(heap, arr[i], cmp);

        let arr_ = [];

        while (heap.length > 0)
            arr_.push(heapq.pop(heap, cmp));
        return arr_
    };

    function siftdown(heap, startIdx, idx, cmp) {
        let item = heap[idx];

        while (idx > startIdx) {
            let parentIdx = (idx - 1) >> 1;
            let parentItem = heap[parentIdx];
            if (cmp(item, parentItem)) {
                heap[idx] = parentItem;
                idx = parentIdx;
                continue
            }
            break
        }

        heap[idx] = item;
    }

    function siftup(heap, idx, cmp) {
        let endIdx = heap.length;
        let startIdx = idx;
        let item = heap[idx];

        let childIdx = idx * 2 + 1;

        while (childIdx < endIdx) {
            let rightIdx = childIdx + 1;

            if (rightIdx < endIdx && (!cmp(
                heap[childIdx], heap[rightIdx]))) {
                childIdx = rightIdx;
            }
            heap[idx] = heap[childIdx];
            idx = childIdx;
            childIdx =  idx * 2 + 1;
        }

        heap[idx] = item;
        siftdown(heap, startIdx, idx, cmp);
    }

    let FRAME_LENGTH = 30;
    let NEXT_FRAME_LENGTH = FRAME_LENGTH;
    let ACTIVE_FRAME_LENGTH = FRAME_LENGTH;

    // heap
    let taskQueue = [];
    let currentFrameDeadline = null;
    let currentTask = null;

    const getTime = () => performance.now();

    function scheduleTask(cb) {
        let startTime = getTime();
        let timeout = 1000 * 60 * 24;
        let newTask = {
            cb,
            startTime,
            deadline: startTime + timeout,
        };
        heapq.push(taskQueue,newTask,cmp);

        currentTask = beginWork;
        planWork();
    }

    function beginWork(){
        let currentTask = heapq.top(taskQueue);
        while(currentTask) {
            if(currentTask.deadline < getTime() && shouldYield()) break
            let cb = currentTask.cb;
            const canExecute = currentTask.deadline >= getTime();
            const isTaskSliceFinish = cb(canExecute);
            if(isTaskSliceFinish) currentTask.cb = isTaskSliceFinish;
            else heapq.pop(taskQueue);

            currentTask = heapq.top(taskQueue);
        }

        return !!currentTask
    }   

    function computedTime(rafTime) {
        const previousFrameDeadline = currentFrameDeadline;
        NEXT_FRAME_LENGTH = rafTime - previousFrameDeadline + ACTIVE_FRAME_LENGTH;
        
        if(NEXT_FRAME_LENGTH < ACTIVE_FRAME_LENGTH && FRAME_LENGTH < ACTIVE_FRAME_LENGTH) {
            if(NEXT_FRAME_LENGTH < 8) NEXT_FRAME_LENGTH = 8;
            else ACTIVE_FRAME_LENGTH = NEXT_FRAME_LENGTH > FRAME_LENGTH ? NEXT_FRAME_LENGTH : FRAME_LENGTH;
        } 
        FRAME_LENGTH = NEXT_FRAME_LENGTH;

        currentFrameDeadline = rafTime + ACTIVE_FRAME_LENGTH;
    }

    let RAFId, RAFTOId;
    function requestAnimationFrameWithTimeout(cb) {
        RAFId = requestAnimationFrame((timestamp) => {
            clearTimeout(RAFTOId);
            cb(timestamp);
        });
        RAFTOId = setTimeout(() => {
            cancelAnimationFrame(RAFId);
            cb(getTime());
        }, FRAME_LENGTH);
    }
    function tickWork() {
        let isTaskNotFinish = currentTask && currentTask();
        if(isTaskNotFinish) {
            planWork();
        } else (currentTask = null);
    }

    function shouldYield() {
        return getTime() > currentFrameDeadline    
    }

    const planWork = (() => {
        const { port1,port2 } = new MessageChannel();
        port1.onmessage = tickWork;
        return (cb) => {
            const work = (timestamp) => {
                computedTime(timestamp);

                // cb只处理hooks，不执行调度
                if(cb) cb(timestamp);
                else port2.postMessage(null); 
            };
            requestAnimationFrameWithTimeout(work);
        }
    })();

    // 小顶堆
    function cmp(task1,task2) {
        return task1.deadline - task2.deadline
    }

    const Hook$1 = function() {
        this.state = null;
        this.next = null;
        this.deps = null;
        this.effect = null;
        this.clear = null;
        this.init = true;
    };

    let getHook = () => getCurrentFiberHook();

    function useState(initState) {
        const reducer = (curState,newValue) => {
            if(typeof newValue != 'function') {
                return newValue
            } else {
                const fn = newValue;
                return fn(curState)
            }
        };

        return useReducer(reducer,initState)
    }

    function useReducer(reducer,initState) {
        const [hook,fiber] = getHook();
        const effect = action => {
            let newState = reducer(hook.state,action);
            if(!shallowEqual__default['default'](newState,hook.state)) {
                hook.state = newState;
                scheduleWorkOnFiber(fiber);
            }
        };

        let init = initHook(hook,(hook) => hook.state = initState);
        return init ? [initState,effect] : [hook.state,effect]
    }

    function useEffect(fn,deps,isLayout = false) {
        useMemo(() => {
            const [hook,fiber] = getHook();
            const oldDeps = hook.deps;
            if(!shallowEqual__default['default'](oldDeps,deps)) {
                hook.deps = deps;
                hook.cb = fn;
                fiber.hooks[isLayout ? 'layout' : 'effect'].push({ effect: fn });
            }
        },[]);
    }

    function useAction(fn,deps) {
        const [hook] = getHook();
        const oldDeps = hook.deps;
        if(!shallowEqual__default['default'](oldDeps,deps)) {
            hook.deps = deps;
            fn();
        }
    }

    function useRef(init) {
        return useMemo(() => ({ current: init }),[])
    }

    function useMemo(cb,deps) {
        const [hook] = getHook();
        if(!initHook(hook,(hook) => {
            hook.state = cb();
            hook.deps = deps;
        })) {
            if(shallowEqual__default['default'](deps,hook.deps)) return hook.state
            else return (hook.state = cb())
        } 
        return hook.state 
    }

    function getCurrentFiberHook() {
        const currentFiber = getCurrentFiber();
        let hooks = currentFiber.hooks ? currentFiber.hooks : (currentFiber.hooks = { hookList: new Hook$1(),effect: [],layout: [] });
        let beforeHook = hooks.hookList;
        return () => {
            return [beforeHook.next || (beforeHook.next = new Hook$1()),currentFiber]
        }
    }

    function useContext(context,selector = (v) => v) {
        // eslint-disable-next-line
        const [_,forceUpdate] = useReducer(_c => _c + 1,0);
        const val = useRef(selector(context.value));

        useLayoutEffect(() => {
            let subFn = (newValue) => {
                if(selector(newValue) === val.current) return 
                val.current = newValue;
                forceUpdate();
            }; 
            context.add(subFn);
            return context.deleteSub(subFn)
        },[]);

        return val.current
    }

    function useLayoutEffect(fn,deps) {
        useEffect(fn,deps,true);
    }

    function reComputeHook() {
        getHook = getCurrentFiberHook();
    }

    function setInitState(hook) {
        hook.init = false;
    }

    function initHook(hook,cb) {
        if(hook.init) {
            setInitState(hook);
            cb(hook);
            hook.init = false;
            return true
        }
        return false
    }

    function SCU(oldProps,newProps) {
        return shallowEqual__default['default'](oldProps,newProps)
    }

    function deleteElement(target) {
        const parentElementNode = target.parentElementFiber.node;
        parentElementNode.removeChild(target.node);
    }

    function insertElement(target) {
        const node = target.node;
        const parentElementFiber = target.parentElementFiber;
        const parentNode = parentElementFiber ? parentElementFiber.node : target.mountDom;

        const insertPoint = target.insertPoint ? target.insertPoint : null;
        let lastPoint = insertPoint ? insertPoint.sibling : null;
        if(lastPoint) lastPoint = lastPoint.node;
        if(lastPoint === node) lastPoint = null;

        parentNode.insertBefore(node,lastPoint);
    }

    function setRef(ref,dom) {
        isFn(ref) ? ref(dom) : (ref && (ref.current = dom));
    }

    function isFn(t) {
        return typeof t === 'function'
    }

    // import { enqueueListenTo } from './events'

    function updateElement(fiber,shouldExecuteEffect = true) {
        const { oldProps = {},props: newProps } = fiber;
        const element = fiber.node;

        for(const prop in { ...oldProps,...newProps }) {
            const oldProp = oldProps[prop];
            const newProp = newProps[prop];

            if(oldProps === newProp || prop === 'children') return
            if(prop === 'style') {
                const newStyles = newProp;
                const oldStyles = oldProp;

                // 浏览器批量重置属性以优化reflow
                // 所以这里无需做新旧对比
                for(let style in Object.assign(oldStyles,newStyles)) {
                    element.style[style] = newStyles[style] || '';
                } 
            } else if(prop.substring(0,2) == 'on') {
                if(shouldExecuteEffect) {
                    const registerEventName = prop[2].toLowerCase() + prop.substring(3);
                    if(!newProps[prop]) element.removeEventListener(registerEventName, oldProps[prop]);
                    else if(!oldProps[prop]) element.addEventListener(registerEventName, newProps[prop]);
                    else if(oldProps[prop] && newProps[prop]) {
                        if(oldProps[prop] !== newProps[prop]) {
                            element.removeEventListener(registerEventName, oldProps[prop]);
                            element.addEventListener(registerEventName, newProps[prop]);
                        }
                    }
                    // if(globalThis.eventDev) enqueueListenTo(registerEventName,fiber,newProps[prop])
                    // else element.addEventListener(registerEventName,newProp)
                }
            } else if(prop === 'key') ; else if(newProps[prop] === false || newProps[prop] == null) {
                element.removeAttribute(prop);
            } else if(prop === 'ref') { 
                if(typeof newProps[prop] === 'function') newProps[prop](element);
            } else {
                element.setAttribute(prop,newProps[prop]);
            } 

        }    
    }

    function setTextContent(fiber,value) {
        fiber.node.textContent = value;
    }

    function mountElement(fiber) {
        if(isFn(fiber.type)) throw new Error('vnode is not Element Type')
        const dom = 
                fiber.type === 'text' 
                    ? document.createTextNode(fiber.value)
                    : document.createElement(fiber.type);
        
        fiber.node = dom;
        dom._limbo__fiber = fiber;
        updateElement(fiber,true);
        return dom
    }

    const DELETE  = 0b00000001;
    const UPDATE  = 0b00000010;
    // TODO: REPLACE flag 参考react reconcileChildArray placeChild函数
    // TODO: Array diff LIS优化
    const REPLACE = 0b00000100; // eslint-disable-line
    const ADD     = 0b00001000;
    const NOWORK  = 0b00010000; // eslint-disable-line

    function createFiberRoot(vnode,mountDom,done) {
        // return new FiberRoot(node,props,done)
        return {
            node: mountDom,
            done,
            props: {
                children: vnode
            },
            tag: HostFiber,
            RootFiber: true
        }
    }

    let updateQueue = [];
    let commitQueue = [];
    let prevCommit;
    let current_execute_work_unit;

    function render(vnode,mountDom,cb) {
        const fiberRoot = createFiberRoot(vnode,mountDom,cb);
        scheduleWorkOnFiber(fiberRoot);
    }

    function scheduleWorkOnFiber(fiber) {
        // 避免重复加入更新队列
        !fiber.dirty && updateQueue.push(fiber) && (fiber.dirty = true);
        scheduleTask(reconcileWork);
    }

    function reconcileWork(dopast) {
        if(!current_execute_work_unit) current_execute_work_unit = updateQueue.shift();

        // fiber level task
        while(current_execute_work_unit && (!shouldYield() || dopast)) {
            try {
                // async diff 
                // 类组件生命周期可能出现多次调用,慎用
                current_execute_work_unit = reconcile(current_execute_work_unit);
            } catch(err) {
                // TODO: Error Boundary
                // eslint-disable-next-line
                console.log(err);
                break
            }
        }

        // 当前时间片用完,但任务还未执行完
        // 把任务继续加入调度,等待恢复
        if(current_execute_work_unit && !dopast) {
            // 等待恢复
            return reconcileWork.bind(null)
        }
        // TODO: commit 
        if(prevCommit) {
            const fiberRoot = prevCommit;
            flushCommitQueue(fiberRoot);
        }
        return null
    }

    function reconcile(currentFiber) {
        currentFiber.parentElementFiber = getParentElementFiber(currentFiber);
        currentFiber.tag == HostFiber ? updateHost(currentFiber) : updateFiber(currentFiber);
        commitQueue.push(currentFiber);
        if(currentFiber.child) return currentFiber.child
        
        while(currentFiber) {
            if(currentFiber.dirty === false && !prevCommit) {
                prevCommit = currentFiber;
                return null
            }
            if(currentFiber.sibling) return currentFiber.sibling
            currentFiber = currentFiber.parent;
        }
    }

    function reconcileChildren(fiber,children) {
        if(!children) return
        const oldFibers = fiber.kids || {};
        const newFibers = (fiber.kids = buildKeyMap(children));

        const reused = {};
        for(let child in oldFibers) {
            const oldChild = oldFibers[child];
            const newChild = newFibers[child];

            // avoid key same but different element
            if(oldChild && newChild && oldChild.type === newChild.type) {
                reused[child] = oldChild;
            } else {
                oldFibers.effect = DELETE;
                commitQueue.push(oldChild);
            }  
        }

        let prevFiber = null;
        for(let child in newFibers) {
            let newChild = newFibers[child];
            let reUseFiber = reused[child];

            if(reUseFiber) {
                if(!sameVnode(reUseFiber,newChild)) {
                    newChild.effect = REPLACE;
                } else {
                    newChild.effect = UPDATE;
                    newChild = { ...reUseFiber,...newChild };
                    newChild.oldProps = reUseFiber.props; 
                    if(reUseFiber.type === 'text') {
                        if(reUseFiber.value !== newChild.value) {
                            if(newChild.value == null) newChild.value = '';
                            setTextContent(reUseFiber,newChild.value);
                        }
                        newChild.effect = NOWORK;
                    }
                }
            } else {
                newChild = createFiber(newChild,ADD);
            }

            newFibers[child] = newChild;
            newChild.parent = fiber;

            if(prevFiber) {
                prevFiber.sibling = newChild;
            } else {
                // 首个子节点为child
                fiber.child = newChild;
            }
            prevFiber = newChild;
        }
        if(prevFiber) prevFiber.sibling = null;

        // 只有fiberRoot有bool值，其他为null
        fiber.dirty = fiber.dirty ? false : null;
    }

    // 更新Fiber节点
    function updateFiber(fiber) {
        const oldProps = fiber.oldProps;
        const newProps = fiber.props;
        
        // 我们内置SCU以避免hooks的无效re-render开销
        if(!fiber.dirty && SCU(oldProps,newProps)) {
            return 
        }

        setCurrentFiber(fiber);
        // 重计算当前fiber的hook链表
        reComputeHook();

        const build = fiber.type;
        const children = build(newProps);
        if(children.type === 'text') ;

        reconcileChildren(fiber,children);
    }

    // 更新真实的Dom节点
    // HostFiber 绝对不可能有vnode fiber作为子节点
    // 所以这里无需加速更新
    function updateHost(elementFiber) {
        if(!elementFiber.node) {
            mountElement(elementFiber);
        }

        // 插入位置是第一个dom父节点的最后
        // 也就是insertBefore
        let parentElementFiber = elementFiber.parentElementFiber || {};
        elementFiber.insertPoint = parentElementFiber.last || null;
        parentElementFiber.last = elementFiber;
        elementFiber.node.last = null; 

        reconcileChildren(elementFiber,elementFiber.props.children);
    }

    // phase2 commit 
    function flushCommitQueue(fiberRoot) {
        commitQueue.forEach((work) => commit(work));
        fiberRoot.done && fiberRoot.done();
        resetOldCommit();

        function resetOldCommit() {
            commitQueue = [];
            prevCommit = null;
            setCurrentFiber(null);
        }
    }

    function commit(fiber) {
        const { effect,hooks,ref } = fiber;

        if(effect === NOWORK) ; else if(effect === DELETE) {
            deleteElement(fiber);
        } else if(fiber.tag === Hook) {
            if(hooks) {
                hooks.layout.forEach(clearPrevEffect);
                hooks.layout.forEach(callEffect);
                planWork(() => {
                    hooks.effect.forEach(clearPrevEffect);
                    hooks.effect.forEach(callEffect);
                });
            } 
        } else if(effect === UPDATE) {
            // debugger
            updateElement(fiber,true);
        } else if(effect === ADD) {
            insertElement(fiber);
        } else ;

        // update
        setRef(ref,fiber.node);
    }

    function sameVnode(oldFiber,curFiber) {
        if(oldFiber.type !== curFiber.type) return false
        if(oldFiber.key !== curFiber.key) return false
        return true
    }

    function buildKeyMap(children) {
        let kidsKeyMap = {};
        if(Array.isArray(children)) {
            children.forEach((child,y) => {
                if(Array.isArray(child)) {
                    child.forEach((c,y1) => {
                        kidsKeyMap[keyMapKeyFactory(2,y1,c.key)] = c;
                    });
                }
                kidsKeyMap[keyMapKeyFactory(1,y,child.key)] = child;
            });
        } else kidsKeyMap[keyMapKeyFactory(0,0,children.key)] = children;
        return kidsKeyMap
    }

    function keyMapKeyFactory(x,y,key) {
        if(y == null) throw('Error: not order y')
        else if(key == null) {
            return x + '.' + y
        } else return x + '.' + y + '.' + key
    }

    function callEffect(state) {
        const effect = state.effect;
        const clear = effect();
        // 清理函数
        if(isFn(clear)) state.clear = clear;
    }

    function clearPrevEffect(state) {
        const { clear } = state;
        clear && clear();
    }

    const limbo = {
        render,
        h,
        createElement: h,
        useState,
        useEffect,
        useAction,
        useRef,
        useReducer,
        useMemo,
        useLayoutEffect,
        useContext
    };

    exports.createElement = h;
    exports.default = limbo;
    exports.h = h;
    exports.render = render;
    exports.useAction = useAction;
    exports.useContext = useContext;
    exports.useEffect = useEffect;
    exports.useLayoutEffect = useLayoutEffect;
    exports.useMemo = useMemo;
    exports.useReducer = useReducer;
    exports.useRef = useRef;
    exports.useState = useState;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=limbo.esm.js.map
