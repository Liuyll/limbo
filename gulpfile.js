const gulp = require('gulp')
const fs = require('fs')
const path = require('path')

gulp.task('copy2test', (done) => {
    const htmlDirPath = path.resolve(__dirname, './packages/limbo-test/html/limbo.esm.js')
    if(fs.existsSync(htmlDirPath)) {
        fs.rmSync(htmlDirPath)
    }

    gulp.src('./lib/limbo.esm.js')
        .pipe(
            gulp.dest('./packages/limbo-test/html')
        )
    done()
})

gulp.task('default', gulp.series('copy2test'), () => {
    console.log('gulp finish')
})