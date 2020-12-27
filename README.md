## limbo 

a mini-react force on / concurrent mode / event-system / fiber

#### 提醒

如果需要，您可以使用类似的框架

[anu](https://github.com/RubyLouvre/anu)

[preact](https://github.com/preactjs/preact)

## advance
+ `schedule`
+ `高性能渲染`
+ `suspense`
+ `简单且体积小`

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

#### Keep-Alive
`Keep-Alive`组件类似`Vue`的`Keep-Alive`组件，它支持在组件卸载后依然保留`vnode`。并在恢复时保证状态不丢失。


## 目前react调度存在的问题

1. 如何确定最小调度单位(minimal time slice)
2. 每秒60帧在高刷新率的时代已经不足
3. 优先级如何确认
4. 已存在的系统如何和全新的调度融合？(参考事件系统)
5. reconcile在异步更新时出现的重复生命周期问题，如何在未来的`v17`版本平滑更新？
6. ......

  当然，`react`已经解决了大量的问题，包括引入`fiber`架构，动态增长每帧可用时间等，但第`3`条问题之复杂，以至于完全可以独立于`schedule`来进行讨论，第 `4,5`条问题也导致`react`无法在不修改老旧的代码情况下平滑开启异步更新。以至于我们不能看到一个稳定版本的调度来进行学习，加上晦涩难懂的源码，导致了很高的学习成本。




