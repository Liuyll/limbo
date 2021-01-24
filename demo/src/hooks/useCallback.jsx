import Limbo, { useCallback } from 'limbos'

function Index() {
    const [add, setAdd] = useState(0)
    const testCallback = useCallback(() => {
        console.log(add)
    }, [])

    useCallback(() => {
        console.log('testCallback change')
    }, [testCallback])

    return (
        <>
            <button onClick={() => setAdd(add + 1)}>{add}</button>
        </>
    )
}

export default Index