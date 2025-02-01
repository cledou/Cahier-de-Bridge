/****************************/
/*        STATUS BAR        */
/****************************/
const status = document.getElementById("status");
var fade_timer;
document.querySelectorAll("[hlp],[alt]").forEach((itm) => {
	itm.addEventListener("mouseover", (e) => {
		e.stopPropagation();
		if (!itm.parentElement.hasAttribute("disabled")) Info(itm.getAttribute("hlp") || itm.getAttribute("alt"));
	});
	itm.addEventListener("mouseout", (e) => {
		Info("");
	});
});

function SetStatus(msg, fade) {
	status.removeAttribute("class");
	status.innerHTML = msg;
	if (fade) {
		if (fade_timer) clearTimeout(fade_timer);
		fade_timer = setTimeout(() => {
			status.innerHTML = "";
			status.removeAttribute("class");
			fade_timer = undefined;
		}, 5000);
	}
}

function Info(msg) {
	if (!fade_timer) status.innerHTML = msg;
}

function Erreur(msg) {
	console.error(msg);
	SetStatus('<img src="/images/error_25px.png"/>' + msg, true);
	status.classList.add("error");
}

function OK(msg) {
	Info('<img src="/images/Ok_25px.png"/>' + msg);
	status.classList.add("ok");
}

function Warning(msg) {
	Info('<img src="/images/Warning Shield.png"/>' + msg, true);
	status.classList.add("warning");
}
