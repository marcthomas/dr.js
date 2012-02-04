/*
 * Dr.js 0.0.6 - Simple JavaScript Documentation
 *
 * Copyright (c) 2011 Dmitry Baranovskiy (http://dmitry.baranovskiy.com/)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 */
var fs = require("fs"),
    path = require("path"),
    docit = require("./doc.js"),
    format = require("./formatter.js"),
    _ref = require("child_process"),
    spawn = _ref.spawn,
    exec = _ref.exec,
    isWindows = process.platform === "win32",
    slash = isWindows ? "\\" : "/",
    docsDir = "docs";

function getPath(filepath) {
    return docsDir + slash + path.basename(filepath, path.extname(filepath));
}

function main(files, targetDir, reporter) {
    var mkdir = isWindows ? "mkdir " : "mkdir -p ",
        cp = isWindows ? "copy " : "cp ",
        dirname = isWindows ? "\"" + __dirname + "\"" : __dirname;

    // default target dir to the cwd
    targetDir = targetDir || process.cwd();

    // default the reporter to the console
    reporter = reporter || console.log;

    var srcs = [],
        chunks = {},
        title = "",
        output = "",
        outputDir = "",
        scripts = [],
        fileName,
        toc = [],
        i, l;

    files.splice(0, 2);

    if (!files.length) {
        reporter("Usage: " + (module.parent ? "dr-js " : "node dr.js ") + "<your_file.js>");
        process.exit(1);
    }

    if (files.length === 1 && path.extname(files[0]) === ".json") {
        var json = JSON.parse(fs.readFileSync(files[0], "utf-8"));
        title = json.title;
        files = [];
        for (i = 0, l = json.files.length; i < l; i++) {
            files.push(json.files[i].url);
            srcs.push(json.files[i].link);
        }
        output = json.output || "";
        scripts = json.scripts || [];
    }

    // create docs dir
    outputDir = output.split("/")[0] || docsDir;
    exec(mkdir + path.resolve(targetDir, outputDir));

    reporter("Trust me, I am a Dr.js");
    for (i = 0, l = files.length; i < l; i++) {
        var filename = files[i];
        fileName = fileName || filename;
        reporter("Processing " + filename);
        var code = fs.readFileSync(filename, "utf-8");
        var res = docit(code, filename, srcs[i]);
        if (res.sections && res.source) {
            toc = toc.concat(res.toc);
            for (var key in res.chunks) if (res.chunks.hasOwnProperty(key)) {
                chunks[key] = res.chunks[key];
            }
            title = title || res.title;
            reporter("Found \033[32m" + res.sections + "\033[0m sections.");
            reporter("Processing \033[32m" + res.loc + "\033[0m lines of code...");
            srcs[i] || (function (filename) {
                fs.writeFile(getPath(filename) + "-src.html", res.source, function () {
                    reporter("Saved to \033[32m" + getPath(filename) + "-src.html\033[0m");
                });
            })(filename);
        } else {
            reporter("\033[31mNo comments in Dr.js format found\033[0m");
            break;
        }
    }

    var TOC = "",
        RES = "";
    toc.sort(function (a, b) {
        if (a.name == b.name) {
            return 0;
        }
        if (a.name < b.name) {
            return -1;
        }
        return 1;
    });
    for (i = 0, l = toc.length; i < l; i++) if (!i || toc[i].name != toc[i - 1].name) {
        TOC += format('<li class="dr-lvl{indent}"><a href="#{name}" class="{clas}"><span>{name}{brackets}</span></a></li>', toc[i]);
        RES += chunks[toc[i].name] || "";
    }
    var html = '<!DOCTYPE html>\n<!-- Generated with Dr.js -->\n<html lang="en"><head><meta charset="utf-8"><title>' + title + ' Reference</title><link rel="stylesheet" href="dr.css" media="screen"><link rel="stylesheet" href="dr-print.css" media="print"></head><body id="dr-js"><div id="dr"><ol class="dr-toc" id="dr-toc">' + TOC + '</ol><div class="dr-doc"><h1>' + title + ' Reference</h1>' + RES + "</div></div>\n";
    for (i = 0, l = scripts.length; i < l; i++) {
        html += '<script src="' + scripts[i] + '"></script>\n';
    }
    html += "</body></html>";

    fs.writeFile(output || (getPath(fileName) + ".html"), html, function (error) {
        if(error) {
            throw error;
        }
        reporter("Saved to \033[32m" + (output || getPath(fileName) + ".html") + "\033[0m");
    });

    // copy css file into the output directory
    exec(cp + dirname + slash + "dr.css " + path.resolve(targetDir, outputDir + slash + "dr.css"));
}

// if dr.js has been required, then return the main function
if (module.parent) {
    module.exports = main;
}
// otherwise execute the script
else {
    main(process.ARGV.slice(0));
}