export const registerNameModules = {}
export const plugins = []
const nameToPluginModules = {}
let eventPluginOrder = []

export const DOMEventPluginOrder = [
    'SimpleEventPlugin',
    // 'ResponderEventPlugin', 
    // 'EnterLeaveEventPlugin',
    // 'ChangeEventPlugin',
    // 'SelectEventPlugin',
    // 'BeforeInputEventPlugin',
]

export function injectEventPluginOrder(
    injectedEventPluginOrder
) {
    eventPluginOrder = [].prototype.slice.call(injectedEventPluginOrder)
    recomputedPluginOrder()
}

export function injectEventPluginsByName(
    injectedEventPluginsNameMap
) {
    for(let pluginName in Object.getOwnPropertyNames(injectedEventPluginsNameMap)) {
        const pluginModule = injectedEventPluginsNameMap[pluginName]
        if(
            !nameToPluginModules[pluginModule] || 
            nameToPluginModules[pluginModule] !== pluginModule
        ) {
            nameToPluginModules[pluginModule] = pluginModule
        }
    }
}

export function recomputedPluginOrder() {
    if(!eventPluginOrder) return
    for(let pluginName of Object.getOwnPropertyNames(nameToPluginModules)) {
        const pluginModule = nameToPluginModules[pluginName]
        let mapPluginModuleIndex = eventPluginOrder.indexOf(pluginModule)
        if(!~mapPluginModuleIndex) throw new Error('register event-plugin occur confusion')
        plugins[mapPluginModuleIndex] = pluginModule

        // TODO:处理eventTypes
    }
}

// export function publishEventPlugin(
//     eventInfo
// ) {
//     const registrationNames = eventInfo.registrationNames
// }