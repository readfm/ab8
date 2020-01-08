var ab = document.createElement('div');
ab.id = 'ab';
document.body.prepend(ab);

//$menu = $("<div id='ab-menu'>8 <div id='ab-cmds'>F4=list F2=link F1=on</div> </div>").appendTo(ab);
$input = $("<div id='ab-input' contentEditable></div>").appendTo(ab);
$field = $("<div id='ab-field'></div>").appendTo(ab);

var select = q => document.querySelector(q);

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

$field[0].addEventListener('change', ev => {
	var a = ev.target,
		text = a.innerText;

		console.log(ev);
	a.classList[(text.trim() == '-')?'add':'remove']('ab-minus');	
});

var setActive = (el) => {
	$field.children('.active').removeClass('active');
	el.classList.add('active');
};

var checkLine = line => {
	var a = line,
		text = a.innerText;

	a.classList.remove('ab-plus');
	a.classList.remove('ab-minus');

	if(text.trim() == '+' || text.trim() == '8'){
		a.classList.add('ab-plus');
	}

	if(text.trim() == '-'){
		a.classList.add('ab-minus');
	}
};

function moveCaretToEnd(el){
    el.focus();
	var range = document.createRange();
	range.selectNode(el);
    //range.collapse(false);
}

function build(item){
	var a = document.createElement('a');
	a.contentEditable = true;
	a.classList.add('item');
	a.href = item.url;
	a.target = '_blank';
	a.innerText = item.text || item.title || '';

	var text = a.innerText.trim();

	$(a).data(item);

	a.addEventListener('click', ev => {
		var a = ev.target,
			text = a.innerText;

		a.classList.toggle('on');

		if(text.trim() == '-'){
			$(a).prevAll('.ab-plus').first().click();
		}
	});

	a.addEventListener('focus', ev => {
		setActive(a);
		a.savedText = a.innerText;
	});

	a.addEventListener('blur', ev => {

		if(a.savedText != a.innerText){
			a.savedText = a.innerText;

			chrome.runtime.sendMessage({
				cmd: 'update', 
				set: {
					text: a.innerText
				},
				id: item.id,
				collection: Cfg.db.main.collection
			});
		}
	});

	/*
	a.addEventListener('mouseenter', ev => {
		a.contentEditable = false;
	});

	a.addEventListener('mouseleave', ev => {
		a.contentEditable = true;
	});
	*/
	
	checkLine(a);

	if(a.classList.contains('ab-plus'))
		a.classList.add('on');


	return a;
}

chrome.runtime.sendMessage({
	cmd: 'list', 
	collection: Cfg.db.main.collection, 
	filter: {
		href: location.href
	}
}, r => {
	r.items.forEach(item => {
		var a = build(item);
		$field.prepend(a);
	});


	chrome.runtime.sendMessage({cmd: 'listTabs'}, r => {
		/*
		if(r.list.length > 1){
			let item = {
				text: '8',
				domain: location.host
			};
			var a = build(item);
			$field.prepend(a);

			chrome.runtime.sendMessage({
				cmd: 'add', 
				item,
				collection: Cfg.db.main.collection
			});
		}
		*/

		r.list.forEach(item => {
			item.type = 'tab';
			item.id_tab = item.id;
			item.id = Math.random().toString(36).substr(2, 6);

			if(item.url != location.href){
				var d = new Date();
				item.time = d.getTime();
				item.domain = location.host;
				item.href = location.href;

				var a = build(item);

				$field.prepend(a);

				chrome.runtime.sendMessage({
					cmd: 'closeTab',
					id: item.id_tab
				});

				chrome.runtime.sendMessage({
					cmd: 'add', 
					item, 
					collection: Cfg.db.main.collection
				});
			}
		});
	});
});

function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function enter(){
	var range = document.getSelection().getRangeAt(0);

	var focused = range.endContainer.parentNode;

	if(focused.classList.contains('item')){
		var text = focused.innerText.trim(),
			item = $(focused).data();


		item.id = Math.random().toString(36).substr(2, 6);

		item.text = '';
		delete item.title;
		delete item._id;
		item.time = item.time.toFixed(2) - 0.01;
		var a = build(item);
		insertAfter(a, focused)
		a.focus();

		chrome.runtime.sendMessage({
			cmd: 'add', 
			item, 
			collection: Cfg.db.main.collection
		});

		ev.preventDefault();
		return false;
	}

	var text = $input.find('.ab-text').text().trim();
	//var text = $focused.text().trim();
	if(!text.length) return false;
	//let $inp = $input.clone();
	//$inp.children().show().after('&nbsp;');
	
	var d = new Date();

	var item = {
		text,
		id: Math.random().toString(36).substr(2, 6),
		time: d.getTime(),
		domain: location.host,
		href: location.href,
		url: $input.find('.ab-url').text()
	};
	var a = build(item);

	chrome.runtime.sendMessage({
		cmd: 'add', 
		item, 
		collection: Cfg.db.main.collection
	});

	$field.show().prepend(a);
	fillup();
}

var prev;
$(document).bind("keydown", function(ev){

	var range = document.getSelection().getRangeAt(0);

	if(/*ev.shiftKey && */ev.key == "Enter"){
		enter();
		ev.preventDefault();
		return false;
	}

	var active = range.startContainer.parentNode;

	if(
		(ev.altKey && ev.key == "ArrowUp") || 
		(ev.shiftKey && ev.key == "F10")
	){
		var $focused = $('.active'),
			$prev = $focused.prevAll('.item').first();

		if($prev.length) $focused.insertBefore($prev);
		moveCaretToEnd($focused[0]);


		ev.preventDefault();
		return false;
	}
	else
	if(ev.key == "F1"){
		ab.hidden = !ab.hidden;

		/*
  		sendResponse({
  			visible: $(ab).is(':visible'),
  			height: $(ab).height()
  		});
	*/
		var text = $input.find('.ab-text').text().trim();

		if(text) enter();
	
		ev.preventDefault();
		return false;
	}
	else
	if(
		(ev.altKey && ev.key == "ArrowDown") || 
		(ev.shiftKey && ev.key == "F9")
	){
		console.log(ev);
		var $focused = $('.active'),
			$next = $focused.nextAll('.item').first();

		if($next.length) $focused.insertAfter($next);
		moveCaretToEnd($focused[0]);

		ev.preventDefault();
		return false;
	}
	else
	if(
		ev.key == "F9" || 
		ev.key == "F10" || 
		ev.key == "ArrowDown" || 
		ev.key == "ArrowUp" 
	){
		var up = (ev.key == 'ArrowUp' || ev.key == 'F10');
		var $focused = $(range.endContainer.parentNode);
		var $another = $focused[up?'prevAll':'nextAll']('.item').first();

		if($focused[0] == $input[0] && !up) 
			return moveCaretToEnd(
				select('#ab-field > .item:first-child')
			);
		else if(up && !$another[0]) 
			return moveCaretToEnd(
				document.querySelector('#ab-input .ab-text')
			) && false;

		if(ev.shiftKey) $focused[0].classList.toggle('selected');
		else $field.find('.selected').removeClass('selected');

		moveCaretToEnd($another[0]);

		//$prev.focus();
		ev.preventDefault();
		return false;
	}

	prev = ev.key;
});

$(document).bind("keyup", function(ev){
	/*
	if(!carousel.$t.children('.focus').length){
		carousel.$t.children().eq(0).addClass('focus');
		return;
	}
	*/

	console.log(ev.key);

	var range = document.getSelection().getRangeAt(0);
	var active = range.startContainer.parentNode;


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
	if(ev.key == "F8"){
		var a = range.endContainer.parentNode,
			text = a.innerText,
			item = $(a).data();

		a.classList.toggle('on');

		if(text.trim() == '-'){
			$(a).prevAll('.ab-plus').first().click();
		}

		if(item.type == 'tab'){
			chrome.runtime.sendMessage({
				cmd: 'closeTab',
				id: item.tab_id
			});

			if(item.url)
				document.location = item.url;
		}

		ev.preventDefault();
		return false;
    }
	else
	if(ev.key == "F2"){
		var $inp = $('#ab-input > div:not([hidden])');
		var $next = $inp.next();
		if(!$next.length) $next = $('#ab-input > div:first-child');

		$next.attr('hidden', null).siblings().attr('hidden', true);


		ev.preventDefault();
		return false;
	}
	else
	if(ev.key == "F4"){
		//carousel.$t.children('.focus').click();
		var text = $input.find('.ab-text').text().trim();
		if(text) enter();

		/*
		var chosenFileEntry = null;

		chrome.runtime.sendMessage({cmd: 'readFile'}, r => {
			$field.show()[0].innerText = r.content;
		});
		*/

		ev.preventDefault();
		return false;
	}
	else
	if(ev.key == "Delete"){
		var $active = $('#ab-field .active');

		$active.next().addClass('active').focus();

		$active.remove();
	}
	else
	if(ev.key == "F7"){
		//carousel.$t.children('.focus').click();

		var chosenFileEntry = null;

		chrome.runtime.sendMessage({cmd: 'writeFile', content: $field[0].innerText});


		ev.preventDefault();
		return false;
	}

	checkLine(active);
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
	console.log(d);
	let $ab = $(ab);
  	if(d.cmd == 'carousel'){
  		ab.hidden = (d.do == 'hide')
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
  		ab.hidden = true;
  		sendResponse({visible: $ab.is(':visible')});
  		//sendResponse({pong: true});
  	}
  	else
  	if(d.cmd == 'checkCarousel'){
  		sendResponse({visible: $ab.is(':visible')});
  	}
  /* Content script action */
});
