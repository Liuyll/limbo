const renderCondTemplate = (cond, descriminat, render) => {
    const template =
`\
    ${cond !== 'else' ? (cond + ' (' + descriminat + ') ' ) : 'else '} {
        return ${render}
    }\
`

    return template
}

export {
    renderCondTemplate
}