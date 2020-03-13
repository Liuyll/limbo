### 一个plugin长什么样?
```
const ClickEventPlugin = {
  eventTypes: {
    change: {
      phasedRegistrationNames: {
        bubbled: 'onClick',
        captured: 'onClickCapture',
      },
      isInteractive: boolean, // 标志是否高优先级反馈
      registrationName: string,
      dependencies: [
        TOP_BLUR,
        TOP_CHANGE,
        TOP_CLICK,
        TOP_FOCUS,
        TOP_INPUT,
        TOP_KEY_DOWN,
        TOP_KEY_UP,
        TOP_SELECTION_CHANGE,
      ],
    },
  }
```

### event-plugin有哪些种类?
  + ResponderEventPlugin
  + SimpleEventPlugin
  + EnterLeaveEventPlugin
  + ChangeEventPlugin
  + SelectEventPlugin
  + BeforeInputEventPlugin

> limbo只实现SimpleEventPlugin
