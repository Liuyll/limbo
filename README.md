## limbo 

a mini-react force on / concurrent mode / event-system / fiber

#### 提醒

limbo不是一个面向业务的框架，它只实现了`sync`级别的优先级调度，并且没有做任何的错误回退，它只适合学习而不适合用于生产环境。

如果您需要用于生产环境，可以试试:

[anu](https://github.com/RubyLouvre/anu)

[preact](https://github.com/preactjs/preact)

### 为什么写limbo？

一言以蔽之，晦涩难懂的`react`源码不适合直接学习，并且调度一直在变化。

##### 先考虑一下react的调度为什么一直是`un_stable`

1. 如何确定最小调度单位(minimal time slice)
2. 每秒60帧在高刷新率的时代已经不足
3. 优先级如何确认
4. 已存在的系统如何和全新的调度融合？(参考事件系统)
5. reconcile在异步更新时出现的重复生命周期问题，如何在未来的`v17`版本平滑更新？
6. ......

  当然，`react`已经解决了大量的问题，包括引入`fiber`架构，动态增长每帧可用时间等，但第`3`条问题之复杂，以至于完全可以独立于`schedule`来进行讨论，第 `4,5`条问题也导致`react`无法在不修改老旧的代码情况下平滑开启异步更新。以至于我们不能看到一个稳定版本的调度来进行学习，加上晦涩难懂的源码，导致了很高的学习成本。



#### limbo 没做什么？

limbo去掉了一系列无用的`fiber`工作，比如：

1. limbo 并没有实现`double fiber tree`双缓冲策略，因为它没有计划实现`Error Boundary`
2. limbo 的事件系统只实现了很常见的几种`TopLevelType`，因为它无需考虑react在生产环境中遇到的各种问题。
3. limbo 把全部优先级都置为了`sync`，`expiration time`也无需再进行计算
4. ...

是的，这也是为什么`limbo`为什么无法用于生产，它只是为了探索`react`到底是怎么运行的。



### 怎么调度？

1. 我们以每帧`16.66ms`标准进行调度，以每个`fiber`更新为最小单位进行调度

   `fiber更新` 中有些细节值得探讨：

   1. DFS遍历`fiber tree`，对每个更新过的节点做标识

   2. 加速更新已有标识的节点
   3. 从底层开始返回，直到根节点。这种遍历方式保证了每个父节点一定被遍历两次(因为加速更新，它实际上只被更新一次)，这种遍历方式让后续的`context`实现非常简单。

2. `fiber`更新子节点时进行`shouldYield`判断，它依赖于上次更新的开始时间和帧长，如果超时则放入调度队列

3. 重新进行调度，查看调度队列是否有剩余未完成的任务

4. 执行未完成的任务，直到调度栈为空



#### 拆分：

limbo把任务拆成了两种level:

1. re-render 
2. single fiber

并对每种级别任务的最小运行周期时做了`shouldYield`检查，并在下一个帧工作时间恢复未完成的任务。

#### 一个简单的调度
```
function beginWork(work) {
  requestIdleCallback(time => {
    while(time.timeRemaining) {
      work.next()
    }
    if(!work.done) beginWork()
  })
}
function *reconcile(){
   while(fiberTraversed) {
      yield asyncDiffFiber()
   }
}
```

##### API依赖：

1. `MessageChannel`
2. `requestAnimationFrame`









