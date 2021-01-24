import Limbo, { useState } from 'limbos'

function Index() {
    const [state, setState] = useState(false)
    return (
        <div>
            <button onClick={() => setState(state + 1)}>add val:{state}</button>
        </div>
    )
}

export default Index