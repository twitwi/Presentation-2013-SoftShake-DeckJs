/*!
Deck JS - deck.smartsyntax
Copyright (c) 2012 Rémi Emonet
Dual licensed under the MIT license and GPL license.
https://github.com/imakewebthings/deck.js/blob/master/MIT-license.txt
https://github.com/imakewebthings/deck.js/blob/master/GPL-license.txt
*/

/*
This module provides a support for a shorter syntax for slides.
*/

(function($, deck, undefined) {
    var $d = $(document);
    var may = function(f) {return f ? f : function() {}};
    var startsWith = function(longStr, part) {return longStr.substr(0, part.length) == part;}
    var startsWithIgnoreCase = function(longStr, part) {return longStr.substr(0, part.length).toUpperCase() == part.toUpperCase();}
    var maybeAddClasses = function(toWhat, spaceSeparatedClasses, uniqueId) {
        if (uniqueId != "") $(toWhat).attr("id", uniqueId);
        if (spaceSeparatedClasses == "") return;
        var parts = spaceSeparatedClasses.split(/ +/);
        for (i in parts) {
            $(toWhat).addClass(parts[i]);
        }
    }

    var interpretationOfSmartLanguage = function(smart, doc) {
        var res = new Array();
        var inSlide = null;
        var indent = "";
        var deepestList = null;
        var remain = smart;

        var processMath = function(content) {
            return content.replace(/\$([^$][^$]*)\$/g, '<span class="latex">\\displaystyle $1</span>').replace(/\$\$/, '$');
        }
        
        var setEnrichedContent = function(what, content) {
            content = processMath(content);
            return what.innerHTML = content;
        }
        var endSlide = function() {
            inSlide = null;
            indent = new Array();
            indent = "";
            deepestList = null;
        }
        
        while (true) {
            var nl = remain.indexOf("\n");
            var line = remain.substring(0, nl).replace(/^[ \t]*/, "");
            // we iterate over the lines
            // treat trailing unique-id and classes before anything
            var uniqueId = "";
            while (line.match(/^(.*)#([^\]\| >]*)$/)) {
                uniqueId = RegExp.$2;
                line = RegExp.$1;
            }
            var addClasses = "";
            {
                while (line.match(/^(.*)\[([^\] >]*)\]$/)) {
                    addClasses = RegExp.$2 + " " + addClasses;
                    line = RegExp.$1;
                }
            }
            if (line == "") {
            } else if (line.match(/^==(.*)==$/)) {
                var title = RegExp.$1;
                if (inSlide) endSlide();
                inSlide = doc.createElement("section");
                $(inSlide).addClass("slide");
                maybeAddClasses(inSlide, addClasses, uniqueId);
                var h = doc.createElement("h1");
                setEnrichedContent(h, title);
                inSlide.appendChild(h);
                deepestList = inSlide;
                res[res.length] = inSlide;
            } else if (line.match(/^=(.*)=$/)) {
                var title = RegExp.$1;
                if (inSlide) endSlide();
                inSlide = doc.createElement("section");
                $(inSlide).addClass("slide");
                maybeAddClasses(inSlide, addClasses, uniqueId);
                var h = doc.createElement("h2");
                setEnrichedContent(h, title);
                inSlide.appendChild(h);
                deepestList = inSlide;
                res[res.length] = inSlide;
            } else if (line.match(/^([-*#]+)(.*)$/)) {
                var pref = RegExp.$1;
                var content = RegExp.$2;
                if (indent == "" && pref == "") {
                    // do not create the li
                } else if (pref == indent) {
                    var li = doc.createElement("li");
                    maybeAddClasses(li, addClasses, uniqueId);
                    setEnrichedContent(li, content);
                    deepestList.appendChild(li);
                } else {
                    // un-push as needed
                    while (! startsWith(pref, indent)) {
                        deepestList = deepestList.parentNode;
                        if (deepestList.tagName == "LI") deepestList = deepestList.parentNode;
                        indent = indent.substr(0, indent.length - 1);
                    }
                    // clean the special '-' that we can use for magic unpush
                    pref = pref.replace(/^-*/, "");
                    // re-push as needed
                    while (pref.length > indent.length) {
                        var asso = {"*": "ul", "#": "ol"};
                        var toPush = pref.substr(indent.length, 1);
                        indent = indent.concat(toPush);
                        var list = doc.createElement(asso[toPush]);
                        if ((deepestList.tagName == "UL" || deepestList.tagName == "OL") && $(">li",deepestList).size() > 0) {
                            $(">li", deepestList).last().append(list);
                        } else {
                            deepestList.appendChild(list);
                        }
                        deepestList = list;
                    }
                    if (indent == "" && pref == "") {
                        // do not create the li
                    } else {
                        var li = doc.createElement("li");
                        maybeAddClasses(li, addClasses, uniqueId);
                        setEnrichedContent(li, content);
                        deepestList.appendChild(li);
                    }
                }
            } else if (line.match(/\/[*]/)) { // block-comments
                var opened = 0;
                while (line != null && remain.length != 0) {
                    if (line.match(/\/[*]/)) {
                        opened += 1;
                    }
                    if (line.match(/.*[*]\//)) {
                        opened -= 1;
                        if (opened <= 0) {
                            // normal stopping condition
                            break;
                        }
                    }
                    if (nl != -1) remain = remain.substring(nl + 1);
                    nl = remain.indexOf("\n");
                    line = remain.substring(0, nl);//.replace(/^ */, "");
                }
            } else if (startsWithIgnoreCase(line, "//")) {
                var di = doc.createElement("div");
                maybeAddClasses(di, addClasses, uniqueId);
                //alert(line + "\n" + deepestList.innerHTML)
                $(di).addClass("comment").html(line.replace(/\/\/ */, "")).appendTo($(">*:not(.comment)", deepestList).last());
            } else if (startsWithIgnoreCase(line, "@CSS ") || startsWithIgnoreCase(line, "@CSS:")) {
                var what = line.replace(/@CSS\:? */i, "");
                var obj = $("<style type='text/css'/>");
                $(obj).html(what).appendTo(inSlide);
            } else if (startsWithIgnoreCase(line, "@CSS!")) {
                var what = line.replace(/@CSS!\:? */i, "");
                var obj = $("<style type='text/css' scoped/>"); // scoped limits the css to it parent and all children of it (see support at http://caniuse.com/#feat=style-scoped )
                $(obj).html(what).appendTo(inSlide);
            } else if (startsWithIgnoreCase(line, "@SVG:")) {
                var parts = line.replace(/@SVG\: */i, "").split(/ +/);
                /*
                var obj = $("<object type='deckjs/svg'/>");
                $.each(parts[0].split(/,/), function(i,c){obj.addClass(c);});
                obj.append($("<param name='src'/>").attr("value", parts[1]))
                    .append($("<param name='width'/>").attr("value", parts[2]))
                    .append($("<param name='height'/>").attr("value", parts[3]))
                    .appendTo(inSlide);
                /*/
                var obj = $("<div class='svg-object'/>");
                $.each(parts[0].split(/,/), function(i,c){obj.addClass(c);});
                obj.attr("data-src", parts[1])
                    .attr("data-width", parts[2])
                    .attr("data-height", parts[3])
                    .appendTo(inSlide);
                //*/
            } else if (startsWithIgnoreCase(line, "@ANIM-PLAY:")) {
                line = line.replace(/@ANIM-PLAY\: */i, "");
                $("<div/>").addClass("anim-play slide").attr("data-what", line).appendTo(deepestList);
            } else if (startsWithIgnoreCase(line, "@ANIM-PAUSE:")) {
                line = line.replace(/@ANIM-PAUSE\: */i, "");
                $("<div/>").addClass("anim-pause slide").attr("data-what", line).appendTo(deepestList);
            } else if (startsWithIgnoreCase(line, "@ANIM-ATTRIBUTE:")) {
                line = line.replace(/@ANIM-ATTRIBUTE\: */i, "");
                var main = line.split(/ *: */);
                $("<div/>").addClass("anim-attribute slide").attr("data-dur", main[0]).attr("data-what", main[1]).attr("data-attr", main[2]+":"+main[3]).appendTo(deepestList);
            } else if (startsWithIgnoreCase(line, "@ANIM-ATTRIBUTE!:")) {
                line = line.replace(/@ANIM-ATTRIBUTE\!\: */i, "");
                var main = line.split(/ *: */);
                $("<div/>").addClass("anim-attribute slide anim-continue").attr("data-dur", main[0]).attr("data-what", main[1]).attr("data-attr", main[2]+":"+main[3]).appendTo(deepestList);
            } else if (startsWithIgnoreCase(line, "@ANIM-APPEAR:")) {
                line = line.replace(/@ANIM-APPEAR\: */i, "");
                if (uniqueId != "") line += "#"+uniqueId; // restore possibly removed id
                var main = line.split(/(:.*)/);
                var dur = main[0];
                var rhs = main[1].replace(/: */, "");
                var animContinue = false;
                if (rhs.substr(rhs.length-1, 1) == "+") {
                    rhs = rhs.substring(0, rhs.length-1);
                    animContinue = true;
                }
                var parts = rhs.split(/ *\| */);
                var lastAdded = $("<div/>");
                for (i in parts) {
                    // process each group of simultaneous animations
                    var subparts = parts[i].split(/ *\+ */);
                    for (ii in subparts) {
                        var what = subparts[ii];
                        var continuating  = ii != subparts.length-1;
                        var add = $("<div/>");
                        add.attr("data-dur", dur);
                        if (what[0] == '-') {
                            add.addClass("anim-hide");
                            what = what.substring(1);
                        } else if (what[0] == '@') {
                            // TODO if it looks like @....@ then the target is specified, else it is just all SVGs root elements
                            add.addClass("anim-viewboxas");
                            what = what.substring(1);
                            add.attr("data-as", what);
                            what = "svg";
                        } else if (startsWithIgnoreCase(what, "%play:")) {
                            what = what.replace(/%play\: */i, "");
                            add.addClass("anim-play").attr("data-what", what);
                        } else if (startsWithIgnoreCase(what, "%pause:")) {
                            what = what.replace(/%pause\: */i, "");
                            add.addClass("anim-pause").attr("data-what", what);
                        } else {
                            add.addClass("anim-show");
                        }
                        add.addClass("slide").attr("data-what", what);
                        if (continuating) add.addClass("anim-continue");
                        add.appendTo(deepestList);
                        lastAdded = add;
                    }
                }
                if (animContinue) {
                    $(lastAdded).addClass("anim-continue");
                }
            } else if (startsWith(line, "@<")) {
                line = line.replace(/^@/, "");
                var contentToAdd = "";
                // test on remain to avoid infinite loop
                while (line != null && remain.length != 0) {
                    if (line.match(/^@<\//)) {
                        // normal stopping condition
                        line = line.replace(/^@/, "");
                        contentToAdd += line + "\n";
                        break;
                    }
                    if (nl != -1) remain = remain.substring(nl + 1);
                    contentToAdd += line + "\n";
                    nl = remain.indexOf("\n");
                    line = remain.substring(0, nl);//.replace(/^ */, "");
                }
                deepestList.innerHTML = deepestList.innerHTML + processMath(contentToAdd) + " ";
            } else {
                while (true) {
                    try {
                        deepestList.innerHTML = deepestList.innerHTML + processMath(line) + " ";
                        break;
                    } catch (e) {
                        // TODO was ok with xhtml not really now
                        remain = remain.substring(nl + 1);
                        nl = remain.indexOf("\n");
                        var line2 = remain.substring(0, nl).replace(/^ */, "");
                        line = line + "\n" + line2;
                    }
                }
            }
            if (nl != -1) remain = remain.substring(nl + 1);
            else break;
        }
        return res;
    }

    // this have to be executed before the deck init
    $d.bind('deck.beforeInit', function() {
            $('.smart').each(function() {
                    var it = this;
                    var slides = interpretationOfSmartLanguage(it.innerHTML, document);
                    it.innerHTML = ""; // clear the smart node
                    $(it).after(slides);
                });
        });

})(jQuery, 'deck');
