const wait_mocks = require('../../../mock')

module.exports = (app) => {
    for(let wait_mock in wait_mocks){
        if(!wait_mocks.hasOwnProperty(wait_mock)) return
        else {
            app.get(wait_mock,(req,res) => {
                let mockobj = wait_mocks[wait_mock]
                if(mockobj.type === 'function') res.end(JSON.stringify(mockobj.data()))
                else res.json(wait_mocks[wait_mock].data)
            })
        }
    }
}