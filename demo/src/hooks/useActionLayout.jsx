import Limbo, { useActionLayout } from 'limbos' 

function Index() {
    let a 
    useActionLayout(() => {
        a = 'action value'
        return () => {
            console.log('unmount')
        }
    }, [])
    console.log(a)
}

export default Index