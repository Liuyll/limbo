import Limbo, { render,h, Suspense } from 'limbos'

const App = function(){
    return (
        <SuspenseTest />
    )
}

function Read() {
    const promise = new Promise(r => setTimeout(r,3000))
    let resolve = false
    promise.then(r => {
        console.log('READ')
        resolve = true
    })
    return {
        get() {
            if(resolve) return 10
            else throw promise
        }
    }
}

function Read1() {
    const promise = new Promise(r => setTimeout(r,3000))
    let resolve = false
    promise.then(r => {
        console.log('READ-1')
        resolve = true
    })
    return {
        get() {
            if(resolve) return 10
            else throw promise
        }
    }
}
function Read2() {
    const promise = new Promise(r => setTimeout(r,5000))
    promise.__test = true
    let resolve = false
    promise.then(r => {
        console.log('READ-2')
        resolve = true
    })
    return {
        get() {
            if(resolve) return 10
            else throw promise
        }
    }
}
function Read3() {
    const promise = new Promise(r => setTimeout(r,7000))
    promise.__test = true
    let resolve = false
    promise.then(r => {
        console.log('READ-3')
        resolve = true
    })
    return {
        get() {
            if(resolve) return 10
            else throw promise
        }
    }
}

// const readCommon = Read()
const read = Read()
const read1 = Read1()
const read2 = Read2()
const read3 = Read3()

function SuspenseTest() {
    return (
        <Suspense fallback={<div>loading</div>}>
            <SuspenseTestChild/>
            <SuspenseTestOther __test/>
            <SuspenseTestChild1/>
        </Suspense>
    )
}


function SuspenseTestChild1() {
    read1.get()
    return (
        <div>i am other child</div>
    )
}

function SuspenseTestOther() {
    return (
        <div>i am other</div>
    )
}
function SuspenseTestChild() {
    read.get()
    read2.get()
    return (
        <Suspense fallback={<div>loading...</div>}>
            <SuspenseTestChildChild/>
        </Suspense>
    )
}
function SuspenseTestChildChild() {
    read3.get()
    return (
        <div>i am child and child</div>
    )
}

export default App
