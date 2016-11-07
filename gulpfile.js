const
    gulp = require('gulp'),
    cleanCSS = require('gulp-clean-css'),
    sass = require('gulp-sass'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    rename = require('gulp-rename');

gulp.task('scripts', function() {
    return gulp.src('./static/js/*.js')
        .pipe(concat('app.js'))
        .pipe(gulp.dest('./static/build'));
});

gulp.task('build-css', function() {
    return gulp.src('static/css/main.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(rename('main.css'))
        .pipe(cleanCSS())
        .pipe(gulp.dest('./static/build'));
});

gulp.task('build-js', [ 'scripts' ], function() {
    return gulp.src('static/build/app.js')
        .pipe(uglify())
        .pipe(rename('app.min.js'))
        .pipe(gulp.dest('./static/build'));
});

gulp.task('default', [ 'build-css', 'build-js' ], function() {});