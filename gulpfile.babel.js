const gulp         = require('gulp');
const data         = require('gulp-data');
const pug          = require('gulp-pug');
const rename       = require('gulp-rename');
const sass         = require('gulp-sass');
const postcss      = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano      = require('cssnano');
const imagemin     = require('gulp-imagemin');
const sourcemaps   = require('gulp-sourcemaps');
const plumber      = require('gulp-plumber');
const deploy       = require('gulp-gh-pages');
const moment       = require('moment');
const deepAssign   = require('deep-assign');
const fs           = require('fs');
const del          = require('del');
const BS           = require('browser-sync');

const browserSync  = BS.create();

// Get NODE_ENV constant
const NODE_ENV = process.env.NODE_ENV || 'development';

// Get root of the site based on currunt environment
const ROOT = NODE_ENV === 'production'
           ? '/chernivtsi/'
           : '/';

// Get content of JSON-file and handle errors
const getJSON = (path) => {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(e);
  }
};

// Render single page based on text object
const render = (text, path = text.lang) => new Promise((resolve, reject) => {
  if (!text) reject(); // Reject if text is not present
  gulp
    .src('layout/!(_)*.pug')
    .pipe(plumber())
    .pipe(data(text))
    .pipe(pug({ pretty: true }))
    .pipe(rename({ dirname: path, basename: 'index' }))
    .pipe(gulp.dest('dist'))
      .on('error', reject)
      .on('end', resolve);
});

// Get array of translation objects from files in specific directory
const getTranslations = (dirname) => new Promise(function(resolve, reject) {
  fs.readdir(dirname, 'utf8', (err, filenames) => {
    if (err) {
      reject(err);
    }
    // Load JSON-object for each file in filenames array
    resolve(filenames.map(f => getJSON(`${dirname}/${f}`)));
  });
});

// Get basic data from data.json, assign translation with basic data,
// and render page for every translation
gulp.task('i18n', function i18n() {
  const data = getJSON('data.json');

  // Return a promise of array of promises
  return getTranslations('i18n')
    .then(langs => {
      const pages = langs.map(lang => render(
        deepAssign(data, lang, { ROOT })
      ));

      return Promise.all(pages);
    });
});

// Render index page based on data.json content
gulp.task('index', function index(cb) {
  const data = getJSON('data.json', cb);

  return render(
    deepAssign(data, { ROOT }), '/'
  );
})

// Process all styles through SASS, Autoprefixer and CSSNano
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

// Compress images and put them in dist folder
gulp.task('images', function images() {
  return gulp
    .src('images/**/*.*')
    .pipe(plumber())
    .pipe(imagemin())
    .pipe(gulp.dest('dist/images'));
});

// Copy favicon in dist folder
gulp.task('favicon', function favicon() {
  return gulp.src('favicon.ico').pipe(gulp.dest('dist'));
});

// Clead dist folder
gulp.task('clean', function clean() {
  return del('dist');
});

// Push the build to the remote gh-pages
gulp.task('gh-pages', function ghPages() {
  return gulp
    .src('dist/**/*.*')
    .pipe(deploy({
      branch: 'gh-pages',
      push: true,
      message: `Update ${moment(new Date()).format('lll')}`
    }))
});

// Render layout (alias for index and i18n)
gulp.task('layout', gulp.parallel('index', 'i18n'));

// Watch changes in sources, build them and reload browser
gulp.task('watch', function watch() {
  browserSync.init({
    server: 'dist'
  });
  gulp.watch(['layout/**/*.pug', 'i18n/**/*.json'], gulp.series('layout'));
  gulp.watch('styles/**/*.scss', gulp.series('styles'));
  gulp.watch('images/**/*.*', gulp.series('images'));

  browserSync.watch('dist/**/*.*').on('change', browserSync.reload);
});

// Build everything
gulp.task('build', gulp.series(
  'clean',
  gulp.parallel('layout', 'styles', 'images', 'favicon')
));

// Deploy dist on gh-pages (build and push)
gulp.task('deploy', gulp.series('build', 'gh-pages'));

// Build and watch changes
gulp.task('serve', gulp.series(
  'build',
  'watch'
));

// Default task (alias for sever)
gulp.task('default', gulp.series('serve'));
