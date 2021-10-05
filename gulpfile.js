/* eslint-disable no-console */

const gulp = require('gulp')
const fs = require('fs')
const path = require('path')

gulp.task('copy2test', (done) => {
    const htmlLibPath = path.resolve(__dirname, './packages/limbo-test/html/limbo.esm.js')
    const htmlSMPath = path.resolve(__dirname, './packages/limbo-test/html/limbo.esm.js.map')
    if(fs.existsSync(htmlLibPath)) {
        fs.rmSync(htmlLibPath)
    }
    if(fs.existsSync(htmlSMPath)) {
        fs.rmSync(htmlSMPath)
    }

    gulp.src('./lib/limbo.esm.js')
        .pipe(
            gulp.dest('./packages/limbo-test/html')
        )

    gulp.src('./lib/limbo.esm.js.map')
        .pipe(
            gulp.dest('./packages/limbo-test/html')
        )

    done()
})

gulp.task('default', gulp.series('copy2test'), () => {
    console.log('gulp finish')
})