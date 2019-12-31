(function(d){var h=[];d.loadImages=function(a,e){"string"==typeof a&&(a=[a]);for(var f=a.length,g=0,b=0;b<f;b++){var c=document.createElement("img");c.onload=function(){g++;g==f&&d.isFunction(e)&&e()};c.src=a[b];h.push(c)}}})(window.jQuery);
$.fn.hasAttr = function(name) { var attr = $(this).attr(name); return typeof attr !== typeof undefined && attr !== false; };

function em1(){var c="nol`511Ajdmpve/dpn";var addr="mailto:";for(var i=0;i<c.length;i++)addr+=String.fromCharCode(c.charCodeAt(i)-1);window.location.href=addr;}

$(document).ready(function() {
r=function(){dpi=window.devicePixelRatio;$('.js-6').attr('src', (dpi>1) ? 'images/pasted-image-34.jpg' : 'images/pasted-image-17.jpg');
$('.js-7').attr('src', (dpi>1) ? 'images/pasted-image-34-1.jpg' : 'images/pasted-image-17-1.jpg');
$('.js-8').attr('src', (dpi>1) ? 'images/pasted-image-420.png' : 'images/pasted-image-210.png');
$('.js-9').attr('src', (dpi>1) ? 'images/pasted-image-34-2.jpg' : 'images/pasted-image-17-2.jpg');
$('.js-10').attr('src', (dpi>1) ? 'images/pasted-image-34-3.jpg' : 'images/pasted-image-17-3.jpg');
$('.js-11').attr('src', (dpi>1) ? 'images/pasted-image-34-4.jpg' : 'images/pasted-image-17-4.jpg');
$('.js-12').attr('src', (dpi>1) ? 'images/pasted-image-36.jpg' : 'images/pasted-image-18.jpg');
$('.js-13').attr('src', (dpi>1) ? 'images/pasted-image-276.png' : 'images/pasted-image-138.png');
$('.js-14').attr('src', (dpi>1) ? 'images/at-42.png' : 'images/at-21.png');
$('.js-15').attr('src', (dpi>1) ? 'images/github-52.png' : 'images/github-26.png');
$('.js-16').attr('src', (dpi>1) ? 'images/linkedin-letters-42.png' : 'images/linkedin-letters-21.png');};
if(!window.HTMLPictureElement){r();}
(function(){$('a[href^="#"]:not(.allowConsent,.noConsent,.denyConsent,.removeConsent)').each(function(){$(this).click(function(){var t=this.hash.length>1?$('[name="'+this.hash.slice(1)+'"]').offset().top:0;return $("html, body").animate({scrollTop:t},400),!1})})})();

});