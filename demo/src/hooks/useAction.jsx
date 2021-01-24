import Limbo, { useAction } from 'limbos' 

function Index() {
    let a 
    useAction(() => {
        a = 'action value'
    }, [])
    console.log(a)
}

export default Index