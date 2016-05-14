import gulp from 'gulp';
import data from 'gulp-data';
import pug from 'gulp-pug';
import rename from 'gulp-rename';
import sass from 'gulp-sass';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import imagemin from 'gulp-imagemin';
import sourcemaps from 'gulp-sourcemaps';
import { readFiles as readDir } from 'node-dir';
import { readFile } from 'fs';
import del from 'del';
import plumber from 'gulp-plumber';
import BS from 'browser-sync';

const browserSync = BS.create();

// Render a page
// Returns a promise which render a page base on translation object and path
const render = (i18n, path) => new Promise((resolve, reject) => {
  if (!!i18n) reject();
  gulp
    .src('layout/!(_)*.pug')
    .pipe(plumber())
    .pipe(data(i18n))
    .pipe(pug({ pretty: true }))
    .pipe(rename({ dirname: (path || i18n.lang), basename: 'index' }))
    .pipe(gulp.dest('dist'))
      .on('error', reject)
      .on('end', resolve);
});

// Render all translations
gulp.task('translations', function translations() {
  return new Promise(function(resolve, reject) {
    let promises = [];

    readDir('translations', (err, content, next) => {
      if (err) reject(err);

      try {
        promises.push(render(JSON.parse(content)));
      } catch (e) {
        reject(console.error(e));
      }

      next();
    }, resolve);

    return Promise.all(promises);
  });
});

// Render index page based on English trans
gulp.task('index', function index(cb) {
  return new Promise(function(resolve, reject) {
    readFile('translations/en.json', 'utf8', (err, content) => {
      if (err) reject(err);

      try {
        resolve(render(JSON.parse(content), '/'));
      } catch (e) {
        reject(console.error(e));
      }

    });
  });
})

gulp.task('styles', function styles() {
  const processors = [
    autoprefixer(),
    cssnano()
  ];

  return gulp
    .src('styles/!(_)*.scss')
    .pipe(sourcemaps.init())
    .pipe(plumber())
    .pipe(sass().on('error', sass.logError))
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

gulp.task('layout', gulp.parallel('index', 'translations'));

gulp.task('watch', function watch() {
  browserSync.init({
    server: 'dist'
  });
  gulp.watch(['layout/**/*.pug', 'translations/**/*.json'], gulp.series('layout'));
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
