var util = require('util');
var exec = require('child_process').exec;
var express = require('express');

var gitFolder = '/home/adam/work/wrs-website'
var gitCommand = 'git log --stat --decorate --source --all --pretty=short';

var output = {data: '', dir: gitFolder, error: ''};

var gitLog = exec(gitCommand, {maxBuffer: 1024 * 500, cwd: gitFolder}, function(error, stdout, stderr) {
  if (error) {
    console.log('Error:', error);
    output.error = error;
  } else {
    output.data = stdout.replace(/\`/g, '\'');
  }
});


var app = express();
app.use(express.static('./'));
app.set('view engine', 'pug');
app.get('/', (req, res) => res.render('gitGraph.pug', output));
app.listen(3001, function() { console.log('lets go!'); });
