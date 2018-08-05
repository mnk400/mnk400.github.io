(function(d){var h=[];d.loadImages=function(a,e){"string"==typeof a&&(a=[a]);for(var f=a.length,g=0,b=0;b<f;b++){var c=document.createElement("img");c.onload=function(){g++;g==f&&d.isFunction(e)&&e()};c.src=a[b];h.push(c)}}})(window.jQuery);
$.fn.hasAttr = function(name) { var attr = $(this).attr(name); return typeof attr !== typeof undefined && attr !== false; };

var lwi=-1;function thresholdPassed(){var w=$(window).width();var p=false;var cw=0;if(w>=768){cw++;}if(w>=960){cw++;}if(w>=1200){cw++;}if(lwi!=cw){p=true;}lwi=cw;return p;}

$(document).ready(function() {
r=function(){if(thresholdPassed()){dpi=window.devicePixelRatio;if($(window).width()>=1200){$('.js-25').attr('src', (dpi>1) ? ((dpi>2) ? 'images/pasted-image-159.png' : 'images/pasted-image-106.png') : 'images/pasted-image-53.png');
$('.js-26').attr('src', (dpi>1) ? ((dpi>2) ? 'images/pasted-image-102.png' : 'images/pasted-image-68.png') : 'images/pasted-image-34.png');
$('.js-27').attr('src', (dpi>1) ? ((dpi>2) ? 'images/adsgaosg-1800.jpg' : 'images/adsgaosg-1200.jpg') : 'images/adsgaosg-600.jpg');
$('.js-28').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_6972-1275.jpeg' : 'images/img_6972-850.jpeg') : 'images/img_6972-425.jpeg');
$('.js-29').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_6377-984.jpg' : 'images/img_6377-656.jpg') : 'images/img_6377-328.jpg');
$('.js-30').attr('src', (dpi>1) ? ((dpi>2) ? 'images/dscf1337-1215.jpg' : 'images/dscf1337-810.jpg') : 'images/dscf1337-405.jpg');
$('.js-31').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_2457-852.jpg' : 'images/img_2457-568.jpg') : 'images/img_2457-284.jpg');
$('.js-32').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_5738-1443.jpeg' : 'images/img_5738-962.jpeg') : 'images/img_5738-481.jpeg');
$('.js-33').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_2840-750.jpg' : 'images/img_2840-500.jpg') : 'images/img_2840-250.jpg');
$('.js-34').attr('src', (dpi>1) ? ((dpi>2) ? 'images/08bfb4d6-f2e2-4be8-b60f-c816c7ab14a7-1422.jpg' : 'images/08bfb4d6-f2e2-4be8-b60f-c816c7ab14a7-948.jpg') : 'images/08bfb4d6-f2e2-4be8-b60f-c816c7ab14a7-474.jpg');}else if($(window).width()>=960){$('.js-25').attr('src', (dpi>1) ? ((dpi>2) ? 'images/pasted-image-129.png' : 'images/pasted-image-86.png') : 'images/pasted-image-43.png');
$('.js-26').attr('src', (dpi>1) ? ((dpi>2) ? 'images/pasted-image-81.png' : 'images/pasted-image-54.png') : 'images/pasted-image-27-1.png');
$('.js-27').attr('src', (dpi>1) ? ((dpi>2) ? 'images/adsgaosg-1440.jpg' : 'images/adsgaosg-960.jpg') : 'images/adsgaosg-480-1.jpg');
$('.js-28').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_6972-1020.jpeg' : 'images/img_6972-680.jpeg') : 'images/img_6972-340.jpeg');
$('.js-29').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_6377-789.jpg' : 'images/img_6377-526.jpg') : 'images/img_6377-263.jpg');
$('.js-30').attr('src', (dpi>1) ? ((dpi>2) ? 'images/dscf1337-969.jpg' : 'images/dscf1337-646.jpg') : 'images/dscf1337-323.jpg');
$('.js-31').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_2457-681.jpg' : 'images/img_2457-454.jpg') : 'images/img_2457-227.jpg');
$('.js-32').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_5738-1155.jpeg' : 'images/img_5738-770.jpeg') : 'images/img_5738-385.jpeg');
$('.js-33').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_2840-600.jpg' : 'images/img_2840-400.jpg') : 'images/img_2840-200.jpg');
$('.js-34').attr('src', (dpi>1) ? ((dpi>2) ? 'images/08bfb4d6-f2e2-4be8-b60f-c816c7ab14a7-1140.jpg' : 'images/08bfb4d6-f2e2-4be8-b60f-c816c7ab14a7-760.jpg') : 'images/08bfb4d6-f2e2-4be8-b60f-c816c7ab14a7-380.jpg');}else if($(window).width()>=768){$('.js-25').attr('src', (dpi>1) ? ((dpi>2) ? 'images/pasted-image-159.png' : 'images/pasted-image-106.png') : 'images/pasted-image-53.png');
$('.js-26').attr('src', (dpi>1) ? ((dpi>2) ? 'images/pasted-image-111.png' : 'images/pasted-image-74.png') : 'images/pasted-image-37.png');
$('.js-27').attr('src', (dpi>1) ? ((dpi>2) ? 'images/adsgaosg-1152.jpg' : 'images/adsgaosg-768.jpg') : 'images/adsgaosg-384.jpg');
$('.js-28').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_6972-816.jpeg' : 'images/img_6972-544.jpeg') : 'images/img_6972-272.jpeg');
$('.js-29').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_6377-633.jpg' : 'images/img_6377-422.jpg') : 'images/img_6377-211.jpg');
$('.js-30').attr('src', (dpi>1) ? ((dpi>2) ? 'images/dscf1337-777.jpg' : 'images/dscf1337-518.jpg') : 'images/dscf1337-259.jpg');
$('.js-31').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_2457-543.jpg' : 'images/img_2457-362.jpg') : 'images/img_2457-181.jpg');
$('.js-32').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_5738-924.jpeg' : 'images/img_5738-616.jpeg') : 'images/img_5738-308.jpeg');
$('.js-33').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_2840-480.jpg' : 'images/img_2840-320.jpg') : 'images/img_2840-160.jpg');
$('.js-34').attr('src', (dpi>1) ? ((dpi>2) ? 'images/08bfb4d6-f2e2-4be8-b60f-c816c7ab14a7-912.jpg' : 'images/08bfb4d6-f2e2-4be8-b60f-c816c7ab14a7-608.jpg') : 'images/08bfb4d6-f2e2-4be8-b60f-c816c7ab14a7-304.jpg');}else{$('.js-25').attr('src', (dpi>1) ? ((dpi>2) ? 'images/pasted-image-150.png' : 'images/pasted-image-100.png') : 'images/pasted-image-50-1.png');
$('.js-26').attr('src', (dpi>1) ? ((dpi>2) ? 'images/pasted-image-108.png' : 'images/pasted-image-72.png') : 'images/pasted-image-36.png');
$('.js-27').attr('src', (dpi>1) ? ((dpi>2) ? 'images/adsgaosg-480.jpg' : 'images/adsgaosg-320.jpg') : 'images/adsgaosg-160.jpg');
$('.js-28').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_6972-447.jpeg' : 'images/img_6972-298.jpeg') : 'images/img_6972-149.jpeg');
$('.js-29').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_6377-342.jpg' : 'images/img_6377-228.jpg') : 'images/img_6377-114.jpg');
$('.js-30').attr('src', (dpi>1) ? ((dpi>2) ? 'images/dscf1337-441.jpg' : 'images/dscf1337-294.jpg') : 'images/dscf1337-147.jpg');
$('.js-31').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_2457-306.jpg' : 'images/img_2457-204.jpg') : 'images/img_2457-102.jpg');
$('.js-32').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_5738-441.jpeg' : 'images/img_5738-294.jpeg') : 'images/img_5738-147.jpeg');
$('.js-33').attr('src', (dpi>1) ? ((dpi>2) ? 'images/img_2840-294.jpg' : 'images/img_2840-196.jpg') : 'images/img_2840-98.jpg');
$('.js-34').attr('src', (dpi>1) ? ((dpi>2) ? 'images/08bfb4d6-f2e2-4be8-b60f-c816c7ab14a7-501.jpg' : 'images/08bfb4d6-f2e2-4be8-b60f-c816c7ab14a7-334.jpg') : 'images/08bfb4d6-f2e2-4be8-b60f-c816c7ab14a7-167.jpg');}}};
if(!window.HTMLPictureElement){$(window).resize(r);r();}
(function(){$('a[href^="#"]:not(.allowConsent,.noConsent,.denyConsent,.removeConsent)').each(function(){$(this).click(function(){var t=this.hash.length>1?$('[name="'+this.hash.slice(1)+'"]').offset().top:0;return $("html, body").animate({scrollTop:t},400),!1})})})();

});