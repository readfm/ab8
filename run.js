var ab = document.createElement('div');
ab.id = 'ab';
document.body.append(ab);

$input = $("<div id='ab-input' contentEditable></div>").appendTo(ab);
$field = $("<div id='ab-field' contentEditable></div>").appendTo(ab);



var url = new URL(location);

var fillup = () => {
	$input.text('');
	$input.append("<span class='current_time'></div>");
	$input.append("&nbsp;");
	$input.append(location.href);
	$input.append("&nbsp;");
	$input.focus();
}

fillup();

setInterval(() => {
	var $fields = $('.current_time');

	if(!$fields.length) return;
	
	var d = new Date;
	var time = ''+d.getFullYear() + d.getMonth() + d.getDay() + d.getHours() + d.getMinutes() + d.getSeconds()

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
		carousel.motion(-25);
		//carousel.$t.children('.focus').prev().addClass('focus').siblings().removeClass('focus');
	}
	else
	if(ev.keyCode == 39){
		carousel.motion(25);
		//carousel.$t.children('.focus').next().addClass('focus').siblings().removeClass('focus');
	}
	else
	if(ev.shiftKey && ev.key == "Enter"){
		ev.preventDefault();

		var input_text = $input[0].innerText;
		$field.show().prepend('<br/>');
		$field.prepend(input_text);
		fillup();

		return false;
	}
	else
	if(ev.key == "F2"){
		//carousel.$t.children('.focus').click();

		var chosenFileEntry = null;

		chrome.runtime.sendMessage({cmd: 'readFile'}, r => {
			console.log(r);
		});
	}
});




chrome.runtime.onMessage.addListener(function(d, sender, sendResponse){
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
