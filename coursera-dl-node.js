#!/usr/bin/env node

var request = require('request');
var filed = require('filed');
var cheerio = require('cheerio');
var url = require('url');
var fs = require('fs');
var async = require('async');
var mkdirp = require('mkdirp');
var program = require('commander');

var courseraClassName = 'startup-001';
var queueSize = 4;

function clean_filename(fname) {


  // Keep extension 
  var ext = '';

  if (fname.indexOf('.') !== -1) {
    ext = '.' + fname.split('.').pop();
    fname = fname.replace(ext,'');
  }

  fname = fname.replace(/\[.*\]/g,'').trim();

  fname = fname.replace(/[^a-z0-9]/gi,'_').replace(/_{2,}/g,"_");

  fname = fname + ext;

  return fname;
}

function openAndWriteToSystemLog(writeBuffer, callback) {
  fs.open('./test.mp4', 'w', function opened(err, fd) {
    if (err) {
      return callback(err);
    }

    function notifyError(err) {
      fs.close(fd, function () {
        callback(err);
      });
    }
    var bufferOffset = 0,
      bufferLength = writeBuffer.length,
      filePosition = null;
    fs.write(fd, writeBuffer, bufferOffset, bufferLength, filePosition,

    function wrote(err, written) {
      if (err) {
        return notifyError(err);
      }
      fs.close(fd, function () {
        callback(err);
      });
    });
  });
}

function download_mp4(task, callback) {
  var downloadURL = task.url;
  var lectureTitle = task.weekTitle.split(':')[0].trim();
  var linkText = task.linkText;
  var outFileName = clean_filename(linkText);
  lectureTitle = clean_filename(lectureTitle);

  //var downloadPath = temp.path({prefix: 'singlePageRaw', suffix: '.mp4'});

  outFileName = courseraClassName + '/' + lectureTitle + '/' + outFileName.replace(/\//g, '_') + '.mp4';
  console.log('Lecture: $s - FileName: %s',lectureTitle,outFileName);

  mkdirp(courseraClassName + '/' + lectureTitle, function(err) {
    if (err) console.error(err);
  });

  fs.exists(outFileName, function(exists) {
    if (!exists) {

      var r2 = request(downloadURL).pipe(fs.createWriteStream(outFileName));

      r2.on('error', function(e) {
        console.error('error');
        console.error(e);
      });

      r2.on('finish', function() {
        callback();
      });

    } else {
      console.log(outFileName + ' exists. Not Downloaded.');
      callback();
    }

  });

}



function login(user,pwd) {
  request({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.2 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-us',
        Connection: 'keep-alive'
    },
    uri: 'https://www.coursera.org/account/signin'
  }).auth(user, pwd, true);
}

function getFiles(courseClassName,courseClassUri) {

  mkdirp('./' + courseClassName, function (err) {
    if (err) console.error(err);
  });

  request({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.2 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-us',
        Connection: 'keep-alive'
    },
    uri: courseClassUri}, function (error, response, body1) {
    if (!error && response.statusCode == 200) {
        //console.log(body1); // Print the google web page.

      $ = cheerio.load(body1);

        var courseItemList = $('div.course-item-list');


          $(courseItemList).find('div.course-item-list-header').each(function() {
            var lectureTitle = $(this).find('h3').text();

            //console.log(lectureTitle);
/*

//Use nextAll and .is until nextUntil is implemented
$('h4').click(function() {
    $(this).nextAll().each(function() {
        if ($(this).is('h4')) { return false; }
        $(this).toggle();
    })
});
*/
          var ul = $(this).next('ul.course-item-list-section-list');


          //$(ul).find('div.course-lecture-item-resource a[title="Video (MP4)"]').each(function () {
          $(ul).find('li').each(function () {

            var linkText = $(this).find('a.lecture-link').text().trim();

            //console.log('linktext: ' + linkText);

            var res = $(this).find('div.course-lecture-item-resource a[title="Video (MP4)"]');

            var mp4Href = $(res).attr('href');

            //console.log('mp4link:' + mp4Href.toString());
            //console.log(linkText);

            // Queue your files for upload
            queue.push({weekTitle: lectureTitle, linkText: linkText, url: mp4Href});


          });

        });


    }

  });
}

program
  .version('0.0.2')
  .option('-u, --user <user>', 'Coursera Username')
  .option('-p, --pwd <pwd>', 'Coursera Password')
  .option('-c, --class <className>', 'Class Name')
  .option('-q, --queue <queueSize>', 'Number of concurrent tasks <4>',queueSize)
  .parse(process.argv);

var queue = async.queue(download_mp4, program.queue); // Run simultaneous downloads

queue.drain = function() {
    console.log("All files are downloaded");
};

login(program.user,program.pwd);
var courseraClassUri = 'https://class.coursera.org/' + program.class + '/lecture/index';
getFiles(program.class,courseraClassUri);