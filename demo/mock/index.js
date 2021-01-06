module.exports = {
    '/test_obj': {
        type: 'object',
        data: {
            name: 'liuyl',
            age: '19'
        }
        
    },
    '/test_func': {
        type: 'function',
        data: () => {
            return {
                time: Date.now(),
                method: 'getTime'
            }
        }
    }
}