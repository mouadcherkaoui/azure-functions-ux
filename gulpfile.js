const gulp = require('gulp');
var shell = require('shelljs');
var gulpMultiProcess = require('gulp-multi-process');
gulp.task('run-dev',  function (cb) {
    return gulpMultiProcess(['run-angular', 'run-server'], cb);
});

gulp.task('run-angular', function (cb) {
    shell.cd('AzureFunctions.AngularClient');
    shell.exec('yarn install');
    shell.exec('yarn run watch', (code, stdout, stderr) => {
        cb();
    });
});

gulp.task('run-server',  (cb) => {
    const runServerCommand = process.platform === 'win32' ? 'yarn run watch' : 'yarn run watchu';
    shell.cd('server');
    shell.exec('yarn install');
    shell.exec('gulp build-all', {async:true});
    shell.exec(runServerCommand, (code, stdout, stderr) => {
        cb();
    });
    
});