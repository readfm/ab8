var ab = document.createElement('div');
ab.id = 'ab';
document.body.prepend(ab);

$input = $("<div id='ab-input' contentEditable></div>").appendTo(ab);
$field = $("<div id='ab-field' contentEditable></div>").appendTo(ab);



var url = new URL(location);

var fillup = () => {
	$input.text('');
	var text = document.createElement('div');
	text.classList.add('ab-text');
	text.innerHTML = '&nbsp';
	$input.append(text);
	var addr = location.href//.replace('http://', '').replace('https://', '');
	$input.append(`<div hidden class='ab-url'>${addr}</div>`);
	$input.append("<span hidden class='current_time'></div>");
	$input.focus();
	placeCaretAtEnd(text);
}

fillup();

setInterval(() => {
	var $fields = $('.current_time');

	if(!$fields.length) return;
	
	var d = new Date;
	var time = ''+d.getFullYear() + 
		(d.getMonth()<10?'0':'')+d.getMonth() + 
		(d.getDay()<10?'0':'')+d.getDay() + 
		(d.getHours()<10?'0':'')+d.getHours() + 
		(d.getMinutes()<10?'0':'')+d.getMinutes() + 
		(d.getSeconds()<10?'0':'')+d.getSeconds();

	$fields.text(time);
}, 1000);

$(document).bind("keydown", function(ev){
	/*
	if(!carousel.$t.children('.focus').length){
		carousel.$t.children().eq(0).addClass('focus');
		return;
	}
	*/

	console.log(ev);

	if(ev.keyCode == 37){
		//carousel.motion(-25);
		//carousel.$t.children('.focus').prev().addClass('focus').siblings().removeClass('focus');
	}
	else
	if(ev.keyCode == 39){
		//carousel.motion(25);
		//carousel.$t.children('.focus').next().addClass('focus').siblings().removeClass('focus');
	}
	else
	if(/*ev.shiftKey && */ev.key == "Enter"){
		ev.preventDefault();

		var text = $input.find('.ab-text').text().trim();
		if(!text.length) return false;
		//let $inp = $input.clone();
		//$inp.children().show().after('&nbsp;');
		var a = document.createElement('a');
		a.contentEditable = true;
		a.classList.add('item');
		a.href = $input.find('.ab-url').text();
		a.innerText = text;

		$field.show().prepend(a);
		fillup();

		return false;
	}
	else
	if(ev.altKey && ev.key == "ArrowUp"){
		console.log(ev);
		var $focused = $(':focus'),
			$prev = $focused.prevAll('.item').first();

		if($prev.length) $focused.insertBefore($prev);
		$focused.focus();
	}
	else
	if(ev.altKey && ev.key == "ArrowDown"){
		console.log(ev);
		var $focused = $(':focus'),
			$next = $focused.nextAll('.item').first();

		if($next.length) $focused.insertAfter($next);
		$focused.focus();
	}
	else
	if(ev.key == "F2"){
		var $inp = $('#ab-input > div:not([hidden])');
		var $next = $inp.next();
		if(!$next.length) $next = $('#ab-input > div:first-child');

		$next.attr('hidden', null).siblings().attr('hidden', true);;
	}
	else
	if(ev.key == "F4"){
		//carousel.$t.children('.focus').click();

		var chosenFileEntry = null;

		chrome.runtime.sendMessage({cmd: 'readFile'}, r => {
			console.log(r);
			$field.show()[0].innerText = r.content;
		});
	}
	else
	if(ev.key == "F7"){
		//carousel.$t.children('.focus').click();

		var chosenFileEntry = null;

		chrome.runtime.sendMessage({cmd: 'writeFile', content: $field[0].innerText});
	}
});


var Pix = {
	leaveGap: function(px){
		Pix.$fixed.each(function(){
			var $el = $(this);
			$el.css('top', $el.data('_pix8-top') + px);
		});

		$('body').css('margin-top', Pix.marginBody + px);
	},

	restoreGap: function(){
		if(isNaN(Pix.marginBody)) return;

		Pix.$fixed.each(function(){
			var $el = $(this);
			$el.css('top', $el.data('_pix8-top'));
		});

		$('body').css('margin-top', Pix.marginBody);
	},

	$fixed: $(),
	collectFixed: function(){
		var $fixed = Pix.$fixed = $('*').filter(function(){
			var $el = $(this);
			var position = $el.css('position');
			var ok = ((
					(position === 'absolute' && !Pix.isRelative($el)) ||
					position === 'fixed'
				) &&
				this.id != 'pic' &&
				!$el.hasClass('carousel-tag') &&
				!isNaN(parseInt($el.css('top')))
			);
			if(ok) $el.data('_pix8-top', parseInt($el.css('top')));
			return ok;
		});

		Pix.marginBody = parseInt($('body').css('margin-top')) || 0;
		Pix.leaveGap(ab.clientHeight + 9);
	},

	isRelative: function($el){
		var y = false;
		$el.parents().each(function(){
			if(['relative', 'fixed', 'absolute'].indexOf($(this).css('position'))+1)
				y = true;
		});

		return y;
	},
};

Pix.collectFixed();


chrome.runtime.onMessage.addListener(function(d, sender, sendResponse){
	let $ab = $(ab);
  	if(d.cmd == 'carousel'){
  		if(d.do) $ab[d.do]();
  		sendResponse({
  			visible: $ab.is(':visible'),
  			height: $ab.height()
  		});

  		if($ab.is(':visible'))
  			Pix.leaveGap($ab.height());
  		else
  			Pix.restoreGap();
  	}
  	else
  	if(d.cmd == 'transformed'){
  		onScroll();
  	}
  	else
  	if(d.cmd == 'carousel.update'){
		if(carousel.getPath() == d.path)
			carousel.$tag.change();
  	}
  	else
  	if(d.cmd == 'auth'){
  		Pix.user = d.user;
  	}
  	if(d.cmd == 'files'){
  		carousel.files = d.files;
  	}
  	else
  	if(d.cmd == 'shot' || d.cmd == 'push'){
			var file = d.src.split('/').pop();
			var carousel = $('#mainCarousel')[0].carousel;

			if(d.skip){

				Pix.send({
					cmd: 'update',
					id: carousel.view.id,
					set: {
						image: file
					},
					collection: Cfg.collection
				});
			}
			else{
  			var $thumbOn = carousel.$t.children().eq(0);
  			carousel.include(Pix.parseURL(d.src), $thumbOn);
			}
  	}
  	else
  	if(d.cmd == 'hideCarousel'){
  		$ab.hide();
  		sendResponse({visible: $ab.is(':visible')});
  		//sendResponse({pong: true});
  	}
  	else
  	if(d.cmd == 'checkCarousel'){
  		sendResponse({visible: $ab.is(':visible')});
  	}
  /* Content script action */
});
