import gulp from 'gulp';
import pug from 'gulp-pug';
import sass from 'gulp-sass';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import imagemin from 'gulp-imagemin';
import sourcemaps from 'gulp-sourcemaps';
import del from 'del';
import moduleImporter from 'sass-module-importer';
import plumber from 'gulp-plumber';
import BS from 'browser-sync';

const browserSync = BS.create();

gulp.task('layout', function layout() {
  return gulp
    .src(['layout/!(_)*.pug'])
    .pipe(plumber())
    .pipe(pug({ pretty: true }))
    .pipe(gulp.dest('dist'))
});

gulp.task('styles', function styles() {
  const processors = [
    autoprefixer(),
    cssnano()
  ];

  return gulp
    .src('styles/!(_)*.scss')
    .pipe(sourcemaps.init())
    .pipe(plumber())
    .pipe(sass({
      importer: moduleImporter()
    }).on('error', sass.logError))
    .pipe(postcss(processors))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/styles'))
    .pipe(browserSync.stream());
});

gulp.task('images', function images() {
  return gulp
    .src('images/**/*.*')
    .pipe(plumber())
    .pipe(imagemin())
    .pipe(gulp.dest('dist/images'));
});

gulp.task('clean', function clean() {
  return del('dist');
});

gulp.task('watch', function watch() {
  browserSync.init({
    server: 'dist'
  });
  gulp.watch('layout/**/*.pug', gulp.series('layout'));
  gulp.watch('styles/**/*.scss', gulp.series('styles'));
  gulp.watch('images/**/*.*', gulp.series('images'));

  browserSync.watch('dist/**/*.*').on('change', browserSync.reload);
});

gulp.task('build', gulp.series(
  'clean',
  gulp.parallel('layout', 'styles', 'images')
));

gulp.task('serve', gulp.series(
  'build',
  'watch'
));

gulp.task('default', gulp.series('serve'));
