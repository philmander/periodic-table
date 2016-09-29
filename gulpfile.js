const
    gulp = require('gulp'),
    cleanCSS = require('gulp-clean-css'),
    compiler = require('google-closure-compiler-js').gulp(),
    concat = require('gulp-concat');

gulp.task('scripts', function() {
    return gulp.src('./static/js/*.js')
        .pipe(concat('app.js'))
        .pipe(gulp.dest('./static/build'));
});

gulp.task('build-css', function() {
    return gulp.src('static/css/main.css')
        .pipe(cleanCSS())
        .pipe(gulp.dest('./static/build'));
});

gulp.task('build-js', [ 'scripts' ], function() {
    return gulp.src('static/build/app.js')
        .pipe(compiler({
            compilationLevel: 'SIMPLE',
            jsOutputFile: 'app.min.js',  // outputs single file
        }))
        .pipe(gulp.dest('./static/build'));
});

gulp.task('default', [ 'build-css', 'build-js' ], function() {});