import Limbo, { useEffect } from 'limbos' 

function Index() {
    const [state, setState] = useState(false)
    return (
        <div>
            <button onClick={() => setState(!state)}>change</button>
            { state ? <Child /> : null}
        </div>
    )
}

function Child() {
    // unmount call
    useEffect(() => {
        console.log('created')
        return () => console.log('unmount')
    }, [])
    return (
        <div>B</div>
    )
}

export default Index