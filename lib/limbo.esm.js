(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('shallowequal')) :
    typeof define === 'function' && define.amd ? define(['exports', 'shallowequal'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.limbo = {}, global._shallowEqual));
}(this, (function (exports, _shallowEqual) { 'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var _shallowEqual__default = /*#__PURE__*/_interopDefaultLegacy(_shallowEqual);

    let current_fiber = null;
    const HostFiber = 0;
    const Hook = 1;

    function createFiber(vnode,op) {
        return { ...vnode,tag: vnode.tag || typeof vnode.type === 'function' ? Hook : HostFiber,effect: op }
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

    function remove(a,t) {
        for(let i = 0;i < a.length;i++) {
            if(a[i] === t) {
                a.splice(i,1);
                return i
            }
        }
        return -1
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

    const __LIMBO_SUSPENSE = Symbol('suspense');

    const __LIMBO_COMPONENT = Symbol('vnode');
    function createElement(type,data,...children) {
        const patchFlag = children.length 
            ? typeof children[children - 1] === 'number' ? children[children.length - 1] : null 
            : null;
        // 兼容ts-loader和babel-jsx-transform的不同
        if(!data) data = {};
        let { 
            key = null,
            ref = null,
            name = null,
            __test = null,
            ..._props
        } = data;

        const {
            __suspense_container,
            fallback,
            boundary,
            ...props
        } = _props;

        if(name) type.name = name;
        children = normalizeChildren(children);

        if(children.length) props.children = children.length === 1 ? children[0] : children;
        if(children.type === 'text') props.children = children;

        let __type = __LIMBO_COMPONENT;
        const additionalProp = {};

        if(__suspense_container) additionalProp.__suspense_container = true;
        if(typeof type === 'function' && type.prototype.constructor.name === 'Suspense') {
            __type = __LIMBO_SUSPENSE;
            if(!fallback) throw new Error('Suspense must get fallback prop!')
            fallback.__suspense_fallback = true;
            additionalProp.pendings = new Map();
            additionalProp.fallback = fallback;
            additionalProp.boundary = boundary;
            additionalProp.__suspenseFlag = Symbol('suspense');
        }
        return {
            __type,
            key,
            ref,
            props,
            type,
            __test,
            ... patchFlag ? { patchFlag } : {},
            ...additionalProp
        }
    }

    function createBlock(type,data,...children) {
        data = {
            ...data,
            __block: true,
            tag: Hook
        };
        return createElement(type, data, children)
    }

    function cloneElement(node,props) {
        const newProps = Object.assign({},node.props,props);
        return {
            ...node,
            props: newProps
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
        else return c
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

        for (let idx = Math.floor(arr.length / 2) - 1; idx >= 0; --idx) siftup(arr, idx, cmp);
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

            if (rightIdx < endIdx && (!cmp(heap[childIdx], heap[rightIdx]))) {
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
    const SYNC       = 0x0000000001;
    const ANY        = 0x0000000010;

    function scheduleTask(cb, priority) {
        const startTime = getTime();
        const timeout = computedTimeout(priority);
        const newTask = {
            cb,
            startTime,
            deadline: startTime + timeout,
            priority
        };
        heapq.push(taskQueue,newTask,cmp);

        currentTask = schedule;
        planWork();
    }

    function schedule(){
        let currentTask = heapq.top(taskQueue);
        while(currentTask) {
            if(currentTask.deadline > getTime() && shouldYield()) break
            currentTask = heapq.pop(taskQueue);

            let cb = currentTask.cb;
            const doImmediately = currentTask.deadline <= getTime();
            const nextTask = cb(doImmediately);
            if(nextTask) {
                // inherit parent priority
                scheduleTask(nextTask, nextTask.priority);
            }
            currentTask = heapq.top(taskQueue);
        }

        return !!currentTask
    }   

    function computedTime(rafTime) {
        const previousFrameDeadline = currentFrameDeadline;
        // 下一帧截止时间: 剩余时间 + 固定帧长
        NEXT_FRAME_LENGTH = rafTime - previousFrameDeadline + ACTIVE_FRAME_LENGTH;
        
        // 自适应固定帧长
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

    function computedTimeout(priority) {
        switch(priority) {
            case SYNC:
                return 0
            case ANY:
            default:
                return 1000 * 60 * 24
        }
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
        return task1.deadline < task2.deadline
    }

    const shallowEqual = (o, n) => {
        if(o === undefined && n === undefined) return false
        return _shallowEqual__default['default'](o, n)
    };

    function SCU(oldProps,newProps) {
        return !shallowEqual(oldProps,newProps)
    }

    function deleteElement(target) {
        const parentElementNode = target.parentElementFiber.node;
        let removeHost = target;
        while(removeHost && removeHost.tag === Hook) removeHost = removeHost.child;
        removeHost && parentElementNode.removeChild(removeHost.node);
        if(target.hooks) {
            target.hooks.effect.forEach(hook => hook.clear && planWork(hook.clear()));
            target.hooks.layout.forEach(hook => hook.clear && hook.clear());
        }
    }

    function insertElement(target) {
        const node = target.node;
        const parentElementFiber = target.parentElementFiber;
        const parentNode = parentElementFiber ? parentElementFiber.node : target.mountDom;

        const insertPoint = target.insertPoint ? target.insertPoint : null;
        let lastPoint = insertPoint ? insertPoint.node.nextSibling : null;

        parentNode.insertBefore(node,lastPoint);
    }

    function replaceElement(target) {
        const node = target.node;
        const parentElementFiber = target.parentElementFiber;
        const parentNode = parentElementFiber ? parentElementFiber.node : target.mountDom;

        const curIndex = target.childIndex;
        parentNode.insertBefore(node, parentNode.childNodes[curIndex + 1]);
    }

    function setRef(ref,dom) {
        isFn(ref) ? ref(dom) : (ref && (ref.current = dom));
    }

    function isFn(t) {
        return typeof t === 'function'
    }

    function getComponentName(type) {
        return type.name
    }

    const Hook$1 = function() {
        this.state = null;
        this.next = null;
        this.deps = null;
        // effect index
        this.effect = null,
        this.clear = null;
        this.init = true;
    };

    let getHook;

    function useState(initState) {
        const reducer = useCallback((curState,newValue) => {
            if(typeof newValue != 'function') {
                return newValue
            } else {
                const fn = newValue;
                return fn(curState)
            }
        }, []);

        return useReducer(reducer,initState)
    }

    function useReducer(reducer,initState) {
        const [hook,fiber] = getHook();
        const effect = useCallback(action => {
            let newState = reducer(hook.state,action);
            if(!shallowEqual(newState,hook.state)) {
                hook.state = newState;
                scheduleWorkOnFiber(fiber);
            }
        }, [reducer]);

        initHook(hook,(hook) => {
            if(typeof initState === 'function') initState = initState();
            hook.state = initState;
        });
        return [hook.state,effect]
    }

    function useCallback(fn, deps) {
        return useMemo(() => fn, deps)
    }

    function useEffect(fn,deps,isLayout = false) {
        const [hook,fiber] = getHook();
        const oldDeps = hook.deps;
        // debugger
        if(!shallowEqual(oldDeps,deps)) {
            hook.deps = deps;
            hook.cb = fn;
            const commitHook = fiber.hooks[isLayout ? 'layout' : 'effect'];
            if(hook.effect != null) {
                commitHook[hook.effect].effect = fn;
            } else {
                commitHook.push({ effect: fn });
                hook.effect = commitHook.length - 1;
            }
            commitHook[hook.effect].call = true;
        }
    }

    function useAction(fn,deps, isEffect) {
        const [hook] = getHook();
        const oldDeps = hook.deps;
        let clear;
        if(!shallowEqual(oldDeps,deps)) {
            hook.deps = deps;
            clear = fn();
        }
        if(isEffect) {
            const effect = isEffect === 'layout' ? useLayoutEffect : useEffect;
            effect(() => clear, deps);
        }
    }

    function useActionEffect(fn, deps) {
        useAction(fn, deps, 'effect');
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
            if(shallowEqual(deps,hook.deps)) return hook.state
            else return (hook.state = cb())
        } 
        return hook.state 
    }



    function useContext(context,selector = (v) => v) {
        // eslint-disable-next-line
        const [_,forceUpdate] = useReducer(_c => _c + 1,0);
        const val = useRef(selector(context.value));

        useActionEffect(() => {
            let subFn = (newValue) => {
                if(selector(newValue) === val.current) return 
                val.current = newValue;
                forceUpdate();
            }; 

            context.addSub(subFn);
            return () => context.deleteSub(subFn)
        }, []);

        return val.current
    }

    function useLayoutEffect(fn,deps) {
        useEffect(fn,deps,true);
    }

    function getCurrentCalledEffect(hooks) {
        return hooks.filter(hook => {
            if(hook.call) {
                hook.call = false;
                return true
            }
            return false
        })
    }

    function getCurrentFiberHook() {
        const currentFiber = getCurrentFiber();
        let hooks = currentFiber.hooks ? currentFiber.hooks : (currentFiber.hooks = { hookList: new Hook$1(),effect: [],layout: [] });
        let beforeHook = hooks.hookList;
        return () => {
            if(!beforeHook.next) beforeHook.next = new Hook$1();
            beforeHook = beforeHook.next;
            const currentHook = beforeHook;
            return [currentHook, currentFiber]
        }
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
            return true
        }
        return false
    }

    function clearAndCallEffect(hooks) {
        const layoutHooks = getCurrentCalledEffect(hooks.layout);
        layoutHooks.forEach(clearPrevEffect);
        layoutHooks.forEach(callEffect);
        planWork(() => {
            const effectHooks = getCurrentCalledEffect(hooks.effect);
            effectHooks.forEach(clearPrevEffect);
            effectHooks.forEach(callEffect);
        });
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

    const DELETE    = 0b00000001;
    const UPDATE    = 0b00000010;
    // TODO: Array diff LIS优化
    const REPLACE   = 0b00000100;
    const ADD       = 0b00001000;
    const NOWORK    = 0b00010000;
    const SUSPENSE  = 0b00100000;

    function createFiberRoot(vnode,mountDom,done) {
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

    const additionalRenderTasks = [];
    const needRecoverSuspenseMap = new Map();
    const suspenseMap = new Map();

    const updateQueue = [];
    const commitQueue = [];

    function render(vnode,mountDom,cb) {
        const fiberRoot = createFiberRoot(vnode,mountDom,cb);
        scheduleWorkOnFiber(fiberRoot);
    }

    function scheduleWorkOnFiber(fiber, force) {
        let currentCommitRoot = {
            current: null,
            root: fiber
        };

        const priority = fiber.__priority || ANY;
        if(force) updateQueue.push(fiber);
        // 避免重复加入更新队列
        else !fiber.dirty && updateQueue.push(fiber) && (fiber.dirty = true);
        scheduleTask(dopast => runWorkLoop.call(null, dopast, currentCommitRoot, null), priority);
    }

    function runWorkLoop(dopast, currentCommitRoot, currentExecuteWorkUnit) {
        // dopast = true
        if(!currentExecuteWorkUnit) currentExecuteWorkUnit = updateQueue.shift();
        // fiber level task
        currentExecuteWorkUnit = performUnitWork(currentCommitRoot, currentExecuteWorkUnit, dopast);

        // time finish but task isn't finish
        if(currentExecuteWorkUnit && !dopast) {
            return dopast => runWorkLoop.call(null, dopast, currentCommitRoot, currentExecuteWorkUnit)
        } 
        while(additionalRenderTasks.length) {
            const task = additionalRenderTasks.shift();
            task();
        }
        
        const delayUntilNoUpdateTask = () => {
            if(updateQueue.length) {
                scheduleTask(delayUntilNoUpdateTask, ANY);
            } else {
                flushCommitQueue(currentCommitRoot.current);
            }
        };
        if(currentCommitRoot.current) {
            delayUntilNoUpdateTask();
        }
        return null
    }

    function performUnitWork(currentCommitRoot, currentExecuteWorkUnit, dopast) {
        while(currentExecuteWorkUnit && (!shouldYield() || dopast)) {
            try {
                currentExecuteWorkUnit = reconcile(currentCommitRoot, currentExecuteWorkUnit);
            } catch(err) {
                // TODO: Error Boundary
                // eslint-disable-next-line
                console.log(err);
                break
            }
        }
        return currentExecuteWorkUnit
    }

    function reconcile(currentRoot, currentFiber) {
        if(
            currentFiber.__type === __LIMBO_SUSPENSE && 
            needRecoverSuspenseMap.get(currentFiber.__suspenseFlag) &&
            currentFiber.props.children &&
            !currentFiber.props.children.__suspense_fallback
        ) {
            return completeUnitWork(currentRoot, currentFiber)
        }
        currentFiber.parentElementFiber = getParentElementFiber(currentFiber);
        let next;
        let suspenseChildCommitQueue = null;
        let suspense;
        if((suspense = findAdjacencySuspense(currentFiber))) {
            const flag = suspense.__suspenseFlag;
            if(!(suspenseChildCommitQueue = suspenseMap.get(flag))) {
                const suspenseQueue = [];
                suspenseChildCommitQueue = suspenseQueue;
                suspenseMap.set(flag, suspenseQueue);
            } else suspenseChildCommitQueue = suspenseMap.get(flag);
        } 
        next = beginWork(currentFiber,suspenseChildCommitQueue);
        
        if(!next) {
            next = completeUnitWork(currentRoot, currentFiber);
        }
        return next
    }

    function beginWork(currentFiber, additionalCommitQueue) {
        let ignoreChildUpdate, fatalError;
        try{
            ignoreChildUpdate = currentFiber.tag == HostFiber ? updateHost(currentFiber) : updateFiber(currentFiber);
        } catch(err) { 
            if(isPromise(err)) {
                const suspense = findAdjacencySuspense(currentFiber);

                if(!suspense) throw Error('maybe need Suspense Wrap Component!')
                if(!suspense.fallback) throw Error('Suspense must get fallback prop!')
                if(suspense.pendings.get(err)) {
                    suspense.pendings.get(err).push(currentFiber);
                } else suspense.pendings.set(err, [currentFiber]);

                // dirty
                if(currentFiber.dirty) currentFiber.dirty = false;
                currentFiber.uncompleted = true;
                
                const { fallback } = suspense;
                if(!needRecoverSuspenseMap.get(suspense.__suspenseFlag)) needRecoverSuspenseMap.set(suspense.__suspenseFlag, suspenseMap.get(suspense.__suspenseFlag));

                /**
                 * !resuming1 && !resuming2 无需恢复
                 * resuming1 && !resuming2 等待恢复
                 * parse1 recover: resuming1 && resuming2 正在恢复
                 * resuming1 && resuming2 == false 终止恢复
                 * parse2 commit: resuming1 && resuming2 完成恢复
                 */
                if(!suspense.__resuming1 && !suspense.__resuming2) {
                    suspense.__resuming1 = true;
                    additionalRenderTasks.push(() => {
                        suspense.__children = suspense.props.children;
                        suspense.props.children = fallback;
                        const container = suspense.child;
                        container.__resume_child = container.child;
                        container.__resume_kids = container.kids;
                        container.__resume_children = container.props.children;
                        container.child = null;
                        container.kids = null;
                        
                        scheduleWorkOnFiber(suspense);
                    });
                } else {
                    if(suspense.__resuming2) {
                        breakRecovery(suspense);
                        suspense.__resumeCommit = null;
                        const container = suspense.child;
                        container.child = container.__fallback_child;
                        container.kids = container.__fallback_kids;
                        container.props.children = container.__fallback_children;
                    }
                }

                const handleSuspenseResolve = () => {
                    const getCurrentPromisePendingFibers = (future) => suspense.pendings.get(future);
                    const getPromisePendingFibersCount = () => suspense.pendings.size;

                    if(err.__limbo_handing) return
                    else err.__limbo_handing = true;
                    
                    const resume = () => {
                        const currentHandleFibers = getCurrentPromisePendingFibers(err);
                        suspense.pendings.delete(err);
                       
                        if(!getPromisePendingFibersCount()) {  
                            suspense.__resuming2 = true;
                            const container = suspense.child;
                            const fallback = container.child;
                            container.__fallback_child = container.child;
                            container.__fallback_kids = container.kids;
                            container.__fallback_children = container.props.children;
                            fallback.effect = DELETE;
                            suspense.__resumeCommit = fallback;
                            container.kids = container.__resume_kids;
                            container.child = container.__resume_child;
                            container.props.children = container.__resume_children;
                            suspense.props.children = suspense.__children;
                            needRecoverSuspenseMap.delete(suspense.__suspenseFlag);
                            
                            suspense.beforeCommit = () => {
                                delete suspense.beforeCommit;
                                // 恢复成功
                                if(suspense.__resuming2) {
                                    delete suspense.__resuming1;
                                    delete container.__resume_kids;
                                    delete container.__resume_children;
                                    delete container.__resume_child;
                                }
                                delete suspense.__resuming2;
                                delete suspense.__resumeQueue;
                                delete container.__fallback_child;
                                delete container.__fallback_kids;
                                delete container.__fallback_children;
                            };
                            suspense.afterCommit = () => {
                                delete suspense.afterCommit;
                                delete suspense.__resumeCommit;
                            };
                            scheduleWorkOnFiber(suspense);
                        } else {
                            currentHandleFibers.forEach(currentFiber => {
                                currentFiber.__skip_commit = true;
                                currentFiber.beforeCommit = () => {
                                    /**
                                     * slice(1) 去除本轮reconcile生成的suspenseMap头部元素
                                     * 此时的头部元素是中断的根fiber，它本来就位于commit队列，不要重复添加
                                     */
                                    const currentReconcileCommits = suspenseMap.get(suspense.__suspenseFlag).slice(1);
                                    const currentSuspenseCommits = needRecoverSuspenseMap.get(suspense.__suspenseFlag);
                                    const resumePoint = currentSuspenseCommits.findIndex(fiber => fiber === currentFiber);
                                    currentSuspenseCommits[resumePoint].uncompleted = false;
                                    currentSuspenseCommits.splice(resumePoint + 1, 0, ...currentReconcileCommits);
                                    delete currentFiber.beforeCommit;
                                };

                                // 如果在reconcile期间有其他恢复，加入调度栈等当前恢复执行完毕后调度
                                currentFiber.afterCommit = () => {
                                    delete currentFiber.__skip_commit;
                                    delete currentFiber.afterCommit;
                                    suspense.__resumeQueue.shift();
                                    CPS();
                                };
                                scheduleWorkOnFiber(currentFiber);
                            });
                        }
                    };
                    const CPS = () => {
                        if(!suspense.__resumeQueue.length) return
                        const task = suspense.__resumeQueue[0];
                        task();
                    };

                    if(!suspense.__resumeQueue || !suspense.__resumeQueue.length) {
                        if(!suspense.__resumeQueue) suspense.__resumeQueue = [resume];
                        else suspense.__resumeQueue.push(resume);
                        CPS();
                    } else {
                        suspense.__resumeQueue.push(resume);
                    }
                };

                const handleSuspenseCatch = (err) => {
                    throw(err)
                }; 

                err.then(
                    _ => handleSuspenseResolve(),
                    _ => handleSuspenseCatch()
                );
            } else {
                fatalError = err;
            }
       
        } finally {
            /* 
                普通提交策略
                当前fiber为子节点添加effect
                当子节点进入reconcile时提交由父节点赋予的effect

                Suspense提交策略
                处于恢复状态的suspense会重新进入渲染，无需提交suspense本身
                但是需要提交fallback子节点
            */
            
            if(currentFiber.__type === __LIMBO_SUSPENSE) {
                if(!commitQueue.includes(currentFiber)) commitQueue.push(currentFiber);
            }
            else commitQueue.push(currentFiber);
            if(additionalCommitQueue && !currentFiber.__suspense_container && !findFallbackAncestor(currentFiber)) {
                // 多个additionCommitQueue
                if(Array.isArray(additionalCommitQueue[0])) additionalCommitQueue.forEach(queue => queue.push(currentFiber));
                else additionalCommitQueue.push(currentFiber);
            }
            if(fatalError) throw fatalError /* eslint-disable-line */
            /* eslint-disable */
            if(!ignoreChildUpdate) return null 
            if(currentFiber && currentFiber.child) return currentFiber.child 
            return null
            /* eslint-enable */
        }
    }

    function breakRecovery(suspense) {
        suspense.__resuming2 = false;
    }

    function completeUnitWork(currentRoot, currentFiber) {
        while(currentFiber) {
            if(currentFiber.dirty === false && currentFiber === currentRoot.root) {
                currentRoot.current = currentFiber;
                return null
            }
            if(currentFiber.sibling) return currentFiber.sibling
            currentFiber = currentFiber.parent;
        }
    }

    function restoreFiber(fiber) {
        if(fiber.restoring) {
            delete fiber.restoring;
            fiber.uncompleted = false;
            return true
        }
    }

    function updateFiber(fiber) {
        const oldProps = fiber.oldProps;
        const newProps = fiber.props;

        if(!fiber.dirty && !SCU(oldProps,newProps)) {
            if(!fiber.uncompleted) {
                fiber.effect = NOWORK;
                return false
            }
            else restoreFiber(fiber);
        }

        setCurrentFiber(fiber);
        reComputeHook();
        const build = fiber.type;
        const children = build(newProps);

        reconcileChildren(fiber,children);
        return true
    }

    function updateHost(elementFiber) {
        if(!elementFiber.node) {
            mountElement(elementFiber);
        }
        restoreFiber(elementFiber);

        // 插入位置是第一个dom父节点的最后
        let parentElementFiber = elementFiber.parentElementFiber || {};
        if(!elementFiber.insertPoint) {
            let parentLastHostFiber = parentElementFiber.last;
            while(parentLastHostFiber && parentLastHostFiber.tag !== HostFiber) parentLastHostFiber = parentLastHostFiber.child;
            elementFiber.insertPoint = parentLastHostFiber;
        } 
        parentElementFiber.last = elementFiber;
        elementFiber.node.last = null; 

        reconcileChildren(elementFiber,elementFiber.props.children);
        return true
    }

    function reconcileText(newFiber,oldFiber) {
        if(newFiber.type !== 'text' || oldFiber.type !== 'text') throw Error('reconcileText must be text type.')
        if(newFiber.value !== oldFiber.Value) setTextContent(oldFiber, newFiber.value);
        if(!newFiber.effect) newFiber.effect = NOWORK;
    }

    function reconcileChildren(fiber,children) {
        if(!children) return
        const oldFibers = fiber.kids || {};
        const newFibers = (fiber.kids = generateKidMarks(children));

        const reused = {};
        for(let child in oldFibers) {
            const oldChild = oldFibers[child];
            const newChild = newFibers[child];
            // avoid key same but different element
            if(oldChild && newChild && sameVnode(oldChild, newChild)) {
                reused[child] = oldChild;
            } else {
                oldChild.effect = DELETE;
                commitQueue.push(oldChild);
            }  
        }

        markStableElements(Object.values(reused));
        let prevFiber = null;

        for(let child in newFibers) {
            let newChild = newFibers[child];
            let reUseFiber = reused[child];

            if(reUseFiber && sameVnode(newChild, reUseFiber)) {
                const newIndex = newChild.childIndex, oldIndex = reUseFiber.childIndex;
                if(reUseFiber.effect === SUSPENSE) {
                    newChild.effect = reUseFiber.uncommited_effect;
                    delete reUseFiber.uncommited_effect;
                    newChild.restoring = true;
                } 
                else newChild.effect = UPDATE;
                newChild = { ...reUseFiber,...newChild };
                newChild.oldProps = reUseFiber.props; 
                if(newIndex !== oldIndex) {
                    if(reUseFiber.__stable) {
                        delete reUseFiber.__stable;
                    } else {
                        newChild.effect = REPLACE;
                        newChild.replaced = reUseFiber;
                    }
                }
                if(reUseFiber.type === 'text' && newChild.type === 'text') reconcileText(newChild, reUseFiber);
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

        fiber.kids = newFibers;
        // 只有更新节点dirty为true，其他全部为undefined
        fiber.dirty = fiber.dirty ? false : null;
    }

    function frozenSuspenseFiber(fiber) {
        fiber.uncompleted = true;
        fiber.uncommited_effect = fiber.effect;
        fiber.effect = SUSPENSE;
    }

    // phase2 commit 
    function flushCommitQueue(root) {
        root.beforeCommit && root.beforeCommit();
        if(root.__skip_commit) {
            commitQueue.forEach(fiber => frozenSuspenseFiber(fiber));
        }
        needRecoverSuspenseMap.forEach(suspenseChildQueue => {
            // TODO: slice(1) 去除Suspense
            suspenseChildQueue.filter(fiber => !fiber.uncompleted).forEach(fiber => frozenSuspenseFiber(fiber));
        });

        if(root.__resumeCommit) commitQueue.unshift(root.__resumeCommit);
        commitQueue.forEach((work) => commit(work));
        root.done && root.done();
        resetOldCommit();
        resetSuspenseMap();
        root.afterCommit && root.afterCommit();
    }

    function resetSuspenseMap() {
        suspenseMap.clear();
        needRecoverSuspenseMap.forEach((queue, key, map) => {
            if(!queue.length) map.remove(key); 
        });
    }

    function resetOldCommit() {
        commitQueue.length = 0;
        setCurrentFiber(null);
    }

    function commit(fiber) {
        const { effect,hooks,ref, uncompleted } = fiber;
        if(uncompleted || effect === SUSPENSE) return

        if(effect === NOWORK) ; else if(effect === DELETE) {
            deleteElement(fiber);
        } else if(fiber.tag === Hook) {
            if(hooks) {
                clearAndCallEffect(hooks);
            } 
        } else if(effect === UPDATE) {
            updateElement(fiber, true);
        } else if(effect === ADD) {
            insertElement(fiber);
        } else if(effect === REPLACE) {
            replaceElement(fiber);
        }

        if(Object.prototype.hasOwnProperty.call(fiber, 'uncommited_effect')) delete fiber.uncommited_effect;
        // update ref
        setRef(ref,fiber.node);
    }

    function findFallbackAncestor(currentFiber) {
        while(currentFiber && !currentFiber.__suspense_fallback) {
            currentFiber = currentFiber.parent;
        }
        return currentFiber && currentFiber.__suspense_fallback ? currentFiber : null
    }

    function findAdjacencySuspense(currentFiber) {
        while(currentFiber && currentFiber.__type !== __LIMBO_SUSPENSE) {
            currentFiber = currentFiber.parent;
        }
        if(!currentFiber || currentFiber.__type !== __LIMBO_SUSPENSE) return null
        return currentFiber
    }

    function sameVnode(oldFiber,curFiber) {
        if(oldFiber.type !== curFiber.type) return false
        if(oldFiber.key !== curFiber.key) return false
        return true
    }

    function generateKidMarks(children) {
        let kidsKeyMap = {};
        if(Array.isArray(children)) {
            children.forEach((child,y) => {
                if(child) {
                    if(Array.isArray(child)) {
                        child.forEach((c,y1) => {
                            kidsKeyMap[getChildUniqueKey(2,y1,c.key)] = c;
                            c.childIndex = y1;
                        });
                    }
                    kidsKeyMap[getChildUniqueKey(1,y,child.key)] = child;
                    child.childIndex = y;
                }
            });
        } else kidsKeyMap[getChildUniqueKey(0,0,children.key)] = children;
        return kidsKeyMap
    }

    function markStableElements(target) {
        // childIndex start: 1
        const _target = target.filter(f => f.childIndex).map(f => f.childIndex - 1);
        const stable = [];
        if(_target.length) stable[0] = _target[0];
        for(let i = 0;i < _target.length; i++) {
            if(_target[i] > stable[stable.length - 1]) {
                stable[stable.length] = _target[i];
            } else {
                const replace = binaryQuery(stable, _target[i]);
                if(_target[i] > stable[replace]) continue
                else if(stable[replace] === _target[i]) continue
                else if(replace === 0) stable[0] = _target[i];
                else stable[replace] = _target[i];
            }
        }
        stable.forEach(i => {
            target[i].__stable = true;
        });
    }

    function binaryQuery(target, point) {
        let left = 0,
            right = target.length - 1;
        while(left < right) {
            const mid = left + ((right - left) >> 1);
            if(target[mid] < point) left = mid + 1;
            else if(target[mid] >= point) right = mid; 
        }
        return left
    }

    function getChildUniqueKey(x,y,key) {
        if(y == undefined) throw('Error: not order y')
        else if(key == undefined) {
            return x + '.' + y
        } else return x + '..' + key
    }

    function isPromise(target) {
        return target instanceof Promise && typeof target.then === 'function'
    }

    function Suspense({ children }) {
        return createElement('div', { __suspense_container: true, class: '__limbo_suspense_container' }, children)
    }

    function createContext(init) {
        const context = {
            value: init,
            _subscribe: new Set(),
            Provider: function({ value,children }) {
                useAction(() => {
                    context.value = value;
                }, [value]);
                useLayoutEffect(() => {
                    context.updateSub();
                }, [value]);
                return children
            },
            Consumer: function({ children,selector }) {
                const value = useContext(context,selector);
                return cloneElement(children,{ value })
            },
            addSub(fn) {
                this._subscribe.add(fn);
            },
            updateSub() {
                this._subscribe.forEach(sub => {
                    sub(this.value);
                });
            },
            deleteSub(sub) {
                this._subscribe.delete(sub);
            }
        };
        return context
    }

    const vnodeCache = new Map();

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
        remove(keys,key);
        cache.set(key,null);
    }

    function KeepAlive(props) {
        const [keys,setKeys] = useState([]);

        const { 
            children: vnode,
            max,
            include,
            exclude
        } = props;

        const name = getComponentName(vnode);

        let noCache = false;
        useAction(() => {
            if (
                (include && (!name || !matches(include, name))) ||
                (exclude && name && matches(exclude, name))
            ) {
                noCache = true;
            }
        },[include,exclude,name]);

        if(noCache) return vnode
        
        const key = vnode.key;
        if(vnodeCache.get(key)) {
            vnode.node = vnodeCache.get(key);
            remove(keys,key);
            keys.push(key);
            setKeys(keys);
        } else {
            vnodeCache.set(key,vnode);
            keys.push(key);
            if(keys.length > max) {
                pruneCacheEntry(
                    vnodeCache,
                    keys,
                    keys[0],
                );
            }
            setKeys(keys);
        }

        return vnode
    }

    function Fragment({ children }) {
        return createBlock('Fragment', null, children)
    }

    const limbo = {
        render,
        h: createElement,
        createElement: createElement,
        useState,
        useEffect,
        useAction,
        useRef,
        useReducer,
        useMemo,
        useLayoutEffect,
        useContext,
        useCallback,
        Fragment,
    };

    exports.Fragment = Fragment;
    exports.KeepAlive = KeepAlive;
    exports.Suspense = Suspense;
    exports.createContext = createContext;
    exports.createElement = createElement;
    exports.default = limbo;
    exports.h = createElement;
    exports.render = render;
    exports.useAction = useAction;
    exports.useCallback = useCallback;
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
