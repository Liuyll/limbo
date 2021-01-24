import Limbo, { useContext, useState, createContext } from 'limbos'

const Context = createContext()

function Provider() {
    const [state, setState] = useState({ value: 1 })

    const handleClick = () => {
        setState({
            ...state,
            value: state.value + 1
        })
    }
    return (
        <Context.Provider value={{ store: state, setState }}>
            <Consumer />
            <button onClick={handleClick}>provider value:{state.value}</button>
        </Context.Provider>
    )
}

function Consumer() {
    const { store, setState } = useContext(Context)
    console.log(store)
    const handleClick = () => {
        setState({
            ...store,
            value: store.value + 1
        })
    }
    return (
        <>
            <div>value: {store.value}</div>
            <button onClick={handleClick}>add</button>
        </>
    )
}

export default Provider