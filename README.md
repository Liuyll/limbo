## limbo 

a mini-react force on / concurrent mode / event-system / fiber

## why limbo
+ 支持自适应帧率的`schedule`系统
+ 比react性能更好的高效渲染与更新
+ 完整的中断与恢复系统`suspense`
+ 支持模板与`JSX`渲染
+ 体积极小

### limbo lis diff
`limbo`引入了算法优化`diff`过程，在极端情况下与`vue3`的`children reconcile`性能一致。

> 需要注意的是，`react`同样引入了简化(or改进)的算法优化`diff`过程，在某些场景下可能会节省`lis`算法的内部处理时间。

### suspense
`limbo`内置了`suspense`，这意味着`limbo`也拥有了完整的中断/恢复功能。

### 调度策略
`limbo`支持最大120帧，并且能自动启发式的更新调度时长，保证应用流畅。
下面简单介绍一下`limbo`的调度策略

#### 拆分：

limbo把任务拆成了两种level:

1. re-render 
2. single fiber

并对每种级别任务的最小运行周期时做了`shouldYield`检查，并在下一个帧工作时间恢复未完成的任务。

#### 一个简单的调度
```
function beginWork(work) {
  requestIdleCallback(deadline => {
    while(deadline.timeRemaining) {
      work.next()
    }
    if(!work.done) beginWork()
  })
}

function *reconcile(hostFiber){
   currentTask = asyncDiffHookFiber(hostFiber.children)
   while(childTraversed) {
      while(!shouldYield() && !currentTask.done()) yield currentTask.next()
   }
}

function *asyncDiffHookFiber(fiber) {
  // 我们假设它无递归Hook子节点
  while(childTraversed) {
    yield* syncDiffHostFiber(fiber.children)
  }
}
```
## use
### hooks
`limbo`不支持`class component`，但全面支持`hooks`:
+ useState
+ useReducer
+ useRef
+ useEffect
+ useLayoutEffect
+ useCallback
+ useMemo
+ useContext

你可以效仿`react`的方法写`limbo`
#### useState
```
import { useState, h } from 'limbo'

function App() {
  const [state,setState] = useState(0)
  return <button>current:{state}</button>
}
```

#### useEffect
```
import { useEffect, h } from 'limbo'

function App() {
  useEffect(() => {
    ...
    return () => {}
  }) 
  return <button>current:{state}</button>
}
```

### 组件
`limbo`提供了几个重要的组件:
+ Context
+ Keep-Alive
+ Fragment

#### Keep-Alive
`Keep-Alive`组件类似`Vue`的`Keep-Alive`组件，它支持在组件卸载后依然保留`vnode`。并在恢复时保证状态不丢失。

#### Context
`Context`是标准的上下文缓存组件，具体功能参考`React`。

#### Fragment
`Fragment`是一个包装组件，它不会被实际渲染。
```
eg: 以下三个组件都会被渲染

<Fragment>
  <Parent1 />
  <Parent2 />
  <Parent3 />
</Fragment>
```

## template
`limbo`拥有一套完善的模板渲染引擎。引擎将会在内部对模板内容进行优化，在可能出现大量变更的场景下，模板拥有比`JSX`更高效的更新。

### 模板指令
+ `l-if`
+ `l-elif`
+ `l-else`
+ `l-bind`
+ `l-for`

#### 循环
模板支持循环功能，例子如下:
```
<div l-for="(data, index) in array">{data}</div>
```
上面的模板会被编译为:
```
array.map((data, index) => <div>{data}</div>)
```

#### 条件
模板支持条件功能，通过`l-if`, `l-elif`, `l-else`来指定对应的条件分支。

一个简单的`demo`如下:
```
<div l-if="isRender">if</div>
<div l-elif="isRender2">elif</div>
<div l-else>else</div>
```

需要注意的是，上面代码里的`l-if`对应的`isRender`不是字符串，而是`Javascript`变量`isRender`。

注意: 条件指令里不能将字符作为条件变量，所有条件变量都被编译为`Javascript`变量。





