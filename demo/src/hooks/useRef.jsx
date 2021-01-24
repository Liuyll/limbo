import Limbo, { useCallback, useRef } from 'limbos'

function Index() {
    const [add, setAdd] = useState(0)
    const addRef = useRef(add)
    const testCallback = useCallback(() => {
        console.log(addRef.current)
    }, [])

    useCallback(() => {
        console.log('testCallback change')
    }, [testCallback])

    return (
        <>
            <button onClick={() => setAdd(add + 1)}>{add}</button>
            <button onClick={() => testCallback()}>call testCallback</button>
        </>
    )
}

export default Index