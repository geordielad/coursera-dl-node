var inspect = require('eyespect').inspector();
var request = require('request');
var filed = require('filed');
var temp = require('temp');
var cheerio = require('cheerio');
var url = require('url');
var fs = require('fs');
var async = require('async');
var mv = require('mv');
var mkdirp = require('mkdirp');

var courseraClassName = 'startup-001';
var courseraClassUri = 'https://class.coursera.org/' + courseraClassName + '/lecture/index';

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
  
  lectureTitle = clean_filename(lectureTitle);
  
  //var downloadPath = temp.path({prefix: 'singlePageRaw', suffix: '.mp4'});
  
  console.log('Starting: ' + lectureTitle);
  
  
  var r = request(downloadURL,function (error, response, body) {
                if (!error && response.statusCode == 200) {

                    //console.log('HEADERS: ' + JSON.stringify(response.headers));
                    //console.log('CONTENT-LENGTH: ' + response.headers['content-length']);
                    //console.log('CONTENT-DISPOSITION: ' + response.headers['content-disposition']);
                  //console.log('Content-Encoding:' + response.headers['content-encoding']);
                  
                mkdirp(courseraClassName + '/' + lectureTitle, function (err) {
                  if (err) console.error(err)
                  else console.log('Created folder: ' + courseraClassName + '/' + lectureTitle)
                });
                  
                var outFileName  = response.headers['content-disposition'].split('=')[1].split('"')[1];
                  outFileName = clean_filename(outFileName);
                outFileName = courseraClassName + '/' + lectureTitle + '/' + outFileName.replace(/\//g,'_');
                var downloadFile = filed(outFileName);
                  
                  console.log(outFileName + ' - Length: ' + response.headers['content-length']);

                  fs.exists(outFileName,function (exists) {
                    if (!exists) {     
                      
                      var r2 = request(downloadURL).pipe(fs.createWriteStream(outFileName));
                      
                      r2.on('error', function(e) {
                        console.error('error');
                        console.error(e);
                      });                          
                      
                      r2.on('end', function() {
                         callback();
                      });
                      
                    }
                    else {
                      console.log(outFileName + ' exists. Not Downloaded.');
                      callback();
                    }
                    
                  });
                    
                  //fs.writeFile(outFileName, body, function (err) {
                  //              if (err) throw err;
                  //              console.log('File saved - ' + outFileName);
                  //         });
                  //});
                  
                            }
  });

     //r.on('end', function() {
     //callback();
  //});

}

var queue = async.queue(download_mp4, 2); // Run two simultaneous downloads

queue.drain = function() {
    console.log("All files are downloaded");
};

request({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.2 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-us',
        Connection: 'keep-alive'
    },
    uri: 'https://www.coursera.org/account/signin'
}).auth('rcottiss@cottiss.com', 'holistic', true);

request({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.2 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-us',
        Connection: 'keep-alive'
    },
    uri: courseraClassUri}, function (error, response, body1) {
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
          var ul = $(this).next('ul.course-item-list-section-list')
          
          
          $(ul).find('div.course-lecture-item-resource a[title="Video (MP4)"]').each(function () {
            
            //if ($(this).is('div.course-item-list-header')) { return false; }
            var mp4Href = $(this).attr('href');
            
            
            //console.log(mp4Href.toString());

            // Queue your files for upload
            queue.push({weekTitle: lectureTitle, url: mp4Href});
  
          });

        });     
      
      
    }

    });
