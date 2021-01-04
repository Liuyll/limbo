import { createBlock } from '../h' 

function Fragment({ children }) {
    return createBlock('Fragment', null, children)
}

export {
    Fragment
}