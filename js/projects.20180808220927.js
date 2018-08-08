(function(d){var h=[];d.loadImages=function(a,e){"string"==typeof a&&(a=[a]);for(var f=a.length,g=0,b=0;b<f;b++){var c=document.createElement("img");c.onload=function(){g++;g==f&&d.isFunction(e)&&e()};c.src=a[b];h.push(c)}}})(window.jQuery);
$.fn.hasAttr = function(name) { var attr = $(this).attr(name); return typeof attr !== typeof undefined && attr !== false; };

var lwi=-1;function thresholdPassed(){var w=$(window).width();var p=false;var cw=0;if(w>=768){cw++;}if(w>=960){cw++;}if(w>=1200){cw++;}if(lwi!=cw){p=true;}lwi=cw;return p;}

$(document).ready(function() {
r=function(){if(thresholdPassed()){dpi=window.devicePixelRatio;if($(window).width()>=1200){$('.js-21').attr('src', (dpi>1) ? ((dpi>2) ? 'images/back-54.png' : 'images/back-36-1.png') : 'images/back-18.png');}else if($(window).width()>=960){$('.js-21').attr('src', (dpi>1) ? ((dpi>2) ? 'images/back-45.png' : 'images/back-30.png') : 'images/back-15-1.png');}else if($(window).width()>=768){$('.js-21').attr('src', (dpi>1) ? ((dpi>2) ? 'images/back-36.png' : 'images/back-24.png') : 'images/back-12.png');}else{$('.js-21').attr('src', (dpi>1) ? ((dpi>2) ? 'images/back-15.png' : 'images/back-10.png') : 'images/back-5.png');}}};
if(!window.HTMLPictureElement){$(window).resize(r);r();}

});