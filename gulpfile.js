var gulp = require('gulp');
var bro = require('gulp-bro');

var chrome_content_script = './chrome-ext/src/content_script/content_script.js';
gulp.task('chrome_content_script', function() {
  gulp.src(chrome_content_script)
    .pipe(bro())
    .pipe(gulp.dest('./chrome-ext/dist/content_script'))
});

gulp.task('default', ['chrome_content_script']);
gulp.watch(chrome_content_script, ['chrome_content_script']);