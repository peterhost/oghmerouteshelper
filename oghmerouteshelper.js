/*
 *
 *  NAME: customroutes.js
 *
 *  Created by Peter Host on 2010-10-25.
 *  Copyright 2010 OGHME.COM. All rights reserved.
 *
 *
 */


/*
    TODO
*/


//var md = require('markdown');
var fs = require('fs');
var fp = require('fileparsers'); // custom
var logger = require('lloging'); // custom
var llog = logger.make(); // create an independant logging instance for this module

llog.on(); // enable logging for this lib

// better typeOf => for array detection
// SOURCE http://javascript.crockford.com/remedial.html
function typeOf(value) {
    var s = typeof value;
    if (s === 'object') {
        if (value) {
            if (typeof value.length === 'number' &&
                    !(value.propertyIsEnumerable('length')) &&
                    typeof value.splice === 'function') {
                s = 'array';
            }
        } else {
            s = 'null';
        }
    }
    return s;
}




/*
 *-----------------------------------------------------------------------
 *                             GENERIC
 *-----------------------------------------------------------------------
 */

//_______________________________________________________________________
//                            ROUTE LISTING
//
//  returns a list containing all the routes to resources of one type (for the mo. file extension is the type)
//  within a given path (directory, subdirectories,...)
//  [
//    {file: 'somearticle', route: [ 'tech', 'js']},
//    {file: 'otherarticle', route: [ 'books']},
//    {file: 'yetanotherarticle'},                           first level element, no route array
//  ]
//
function routeList(path, extension) {
  var itemList,
      i,
      // pathreg removes : 1) initial DIR path from a string, 2) AND the `.extension` from the end of a string
      // the .replace part removes the trailing slash from `path` as slash will be the splitting delimiter
      pathreg = new RegExp(path.replace(/([^\/])$/, '$1/') + '|\\.' + extension, 'g'),
      routes = []; // array of the different routes available in the category ARTICLE

  function mkroute(thisPath) {
    var localURI = thisPath.replace(pathreg, ""),
    tmparr = [],
    tmpobj = {};
    tmparr = localURI.split('/'); // split the path
    tmpobj.file = tmparr.pop(); // the last element is the filename radical
    if (tmparr.length > 0) { // the remaining of the array is the route
        tmpobj.route = tmparr;
    }
    routes.push(tmpobj);
  }

  // valid dirpath ?
  fs.stat(path, function (err, stat) {
    if (err) {
        throw err;
    }
    if (!stat.isDirectory())  {
        throw new Error("ERROR : [" + path + "] is not a valid dirpath");
    }
  });

  // valid file extension string ?
  if (!extension || typeOf(extension) !== "string" || !/^\w+$/.test(extension)) {
    throw "ERROR : invalid extension " + extension;
  }

  // fetch the filelist
  itemList = fp.rparsefSYNC(
      path,
      fp.matcher(extension)
  );

  // extract the info
  for (i = 0; i < itemList.length; i += 1) {
    mkroute(itemList[i]);
  }

  // stick 2 properties to the object
  routes.path = path;
  routes.extension = extension;
  return routes;
}


//    ignore: a valid regex object
function routeList2 (path, extension, ignore) {
  var itemList,
      i,
      // pathreg removes : 1) initial DIR path from a string, 2) AND the `.extension` from the end of a string
      // the .replace part removes the trailing slash from `path` as slash will be the splitting delimiter
      pathreg = new RegExp(path.replace(/([^\/])$/, '$1/') + '|\\.' + extension, 'g'),
      routes = []; // array of the different routes available in the category ARTICLE

  function mkroute(thisPath) {
    var localURI = thisPath.replace(pathreg, ""),
    tmparr = [],
    tmpobj = {};
    tmparr = localURI.split('/'); // split the path
    tmpobj.file = tmparr.pop(); // the last element is the filename radical
    if (tmparr.length > 0) { // the remaining of the array is the route
        tmpobj.route = tmparr;
    }
    routes.push(tmpobj);
  }

  // only run for paths not in the ignore regexp
  if (!ignore.test(path)) {
    // valid dirpath ?
    fs.stat(path, function (err, stat) {
      if (err) {
          throw err;
      }
      if (!stat.isDirectory())  {
          throw new Error("ERROR : [" + path + "] is not a valid dirpath");
      }
    });

    // valid file extension string ?
    if (!extension || typeOf(extension) !== "string" || !/^\w+$/.test(extension)) {
      throw "ERROR : invalid extension " + extension;
    }

    // fetch the filelist
    itemList = fp.rparsefSYNC(
        path,
        fp.matcher(extension)
    );

    // extract the info
    for (i = 0; i < itemList.length; i += 1) {
      mkroute(itemList[i]);
    }

    // stick 2 properties to the object
    routes.path = path;
    routes.extension = extension;
    return routes;
  }
}
//_______________________________________________________________________
//                           ROUTE SORTING
//
//  sortTidiedRouteList
//  sort an array generated by tidyroutes()
function sortTidiedRouteList(a, b) {
    if (a.route < b.route) {
        return -1;
    }
    else if (a.route > b.route) {
        return 1;
    }
    else {
        return 0;
    }
}
//objs.sort(sortTidiedRouteList);


//_______________________________________________________________________
//                         ROUTE TIDYING
//
// tidyroutes
// orders a file-centric routes list obtained with routeList()
// [
//      { file: 'somearticle'   ,  route: [ 'tech', 'js']  },
//      { file: 'somearticle2'  ,  route: [ 'tech', 'js']  },
//      { file: 'otherarticle'  ,  route: [ 'books']       },
//      { file: 'yetanotherarticle'                        },
// ]
//      => into a route-centric list
// [
//      { route: 'tech/js'  , files: ['somearticle', 'somearticle2'] },         note: no trailing slash
//      { route: 'books'    , files: ['otherarticle']                },
//      { route: '.'     , files: ['yetanotherarticle']           }         '.': top level route
// ]
//
function tidyroutes(routes) {
  var newroutes = [], i;

  // populate one entry of the new `newroutes` array
  function addFileToRoute(tmproute, tmpfile) {
    var j,
    initlength = newroutes.length; // store initial value for loop limit, as we will augment the array in the loop
    //for (i = 0; i < .newroutes.length; i += 1) {
    for (j = 0; j < 100; j += 1) {
      if (newroutes[j] && newroutes[j].route && newroutes[j].route === tmproute) {
        // route already there, append to files array
        newroutes[j].files.push(tmpfile);
        return;
      }
    }
    // route not found, create it and assign it a singleton array containing tmpfile
    newroutes.push({'route': tmproute, 'files': [tmpfile]});
  }


  function routeConcat(oldroute) { // oldroute ~ {file: 'somearticle', route: [ 'some', 'route']},
    var concat = '', rtlist, j;
    // top level route
    if (!oldroute.route) { // (no 'route' property)
        addFileToRoute('.',  oldroute.file);
    }
    // other routes
    else {
      rtlist = oldroute.route;
      // concatenate array rtlist into a route
      for (j = 0; j < rtlist.length; j += 1) {
        concat += rtlist[j];
        if (j < rtlist.length - 1) { // only add a slash __between__ route segments
          concat += '/';
        }
      }
      addFileToRoute(concat, oldroute.file);
    }
  }


  // transform the old route list into the new one
  for (i = 0; i < routes.length; i += 1) {
    routeConcat(routes[i]);
  }
  newroutes.sort(sortTidiedRouteList);

  // copy the original 'routes' array's properties
  newroutes.path = routes.path;
  newroutes.extension = routes.extension;

  llog.l(newroutes);
  return newroutes;
}


//_______________________________________________________________________
//                         METADATA
//
// getMeta (SYNC)
function getMeta(basepath, route, file, ext) {
    var tmprt = route === '.' ? '' : route + '/',
        content = fs.readFileSync( basepath + '/' + tmprt + file + '.' + ext, 'utf8');

    //llog.l(content);

}







/*
 *-----------------------------------------------------------------------
 *                          HTML FUNCTIONS
 *-----------------------------------------------------------------------
 */

//_______________________________________________________________________
//                         GENERIC
//
// toHTMLtree
//
// returns a HTML tree representing a list of routes, from a 'tidied' route array
// (cf. tidyroutes())
// [
//      { route: 'tech/js'  , files: ['somearticle', 'somearticle2'] },         note: no trailing slash
//      { route: 'books'    , files: ['otherarticle']                },
//      { route: '.'     , files: ['yetanotherarticle']           }         '.': top level route
// ]

function toHTMLtree(tidyRoutes) {
    var route, indent, files, HTML = '\n<ul>', i, j, meta;
    //llog.l('tidied routes:', tidyRoutes);
    for (i = 0; i < tidyRoutes.length; i += 1) {
        route = tidyRoutes[i].route;
        files = tidyRoutes[i].files; // files concerned by this route
        indent = route.split('/').length - 1;
        HTML += '<li>' + route + '<ul>';
        for (j = 0; j < files.length; j += 1) {
            meta = getMeta(tidyRoutes.path, route, files[j], tidyRoutes.extension);
            HTML += '<li class="indent' + indent + '"><a href="' + route + '/' + files[j] + '">' + files[j] + '</a></li>';
        }
        HTML += '</ul></li>';
    }
    HTML += '\n</ul>';
    return HTML;
}

//_______________________________________________________________________
//                         ARTICLES
//
// md_routeList
//
// returns a HTML index of 'markdown' files in a given directory
function md_routeList(path) {
    var list = routeList(path, 'markdown');
    if (list) {
        return toHTMLtree(tidyroutes(list));
    }
    return "<p>No documents were found</p>";
}





exports.md_routeList = md_routeList;
exports.routeList = routeList;
exports.routeList2 = routeList2;
