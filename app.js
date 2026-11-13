const translations = {
ru:{tagline:"Учусь • Говорю • Играю",welcome:"Привет! Рады тебя видеть",littleSteps:"Маленькие шаги — большие открытия",hello:"Привет!",welcomeText:"Здесь можно общаться, учиться и узнавать новое. Всё получится — в своём темпе.",youCan:"Ты можешь больше, чем думаешь!",choosePath:"ВЫБЕРИ СВОЁ ПРИКЛЮЧЕНИЕ",whereStart:"С чего начнём?",tapCard:"Нажми на карточку",talkTitle:"Я хочу сказать",talkDesc:"Общение с помощью картинок",start:"Начать",learnTitle:"Учусь",learnDesc:"Речь, буквы, цифры и формы",explore:"Исследовать",worldTitle:"Мир вокруг меня",worldDesc:"Животные, природа и транспорт",discover:"Узнавать",feelTitle:"Мои эмоции",feelDesc:"Радость, грусть, злость и покой",feelAction:"Рассказать",kindMessage:"Здесь не нужно спешить. Учись и играй так, как тебе удобно.",navHome:"Главная",navProgress:"Прогресс",navParents:"Родителям",navSpecialist:"Специалисту",coming:"Этот раздел будет добавлен следующим этапом. Сейчас мы создаём основу МОГУ.",home:"Главная"},
kk:{tagline:"Үйренемін • Сөйлеймін • Ойнаймын",welcome:"Сәлем! Қош келдің!",littleSteps:"Кішкентай қадамдар — үлкен жаңалықтар",hello:"Сәлем!",welcomeText:"Мұнда сөйлесуге, үйренуге және жаңа нәрселерді білуге болады. Бәрі өз қарқыныңмен!",youCan:"Сенің қолыңнан көп нәрсе келеді!",choosePath:"ӨЗІҢЕ ҰНАЙТЫН БӨЛІМДІ ТАҢДА",whereStart:"Неден бастаймыз?",tapCard:"Карточканы бас",talkTitle:"Менің айтқым келеді",talkDesc:"Суреттер арқылы қарым-қатынас",start:"Бастау",learnTitle:"Үйренемін",learnDesc:"Сөйлеу, әріптер, сандар мен пішіндер",explore:"Зерттеу",worldTitle:"Қоршаған әлем",worldDesc:"Жануарлар, табиғат және көлік",discover:"Танимын",feelTitle:"Менің эмоцияларым",feelDesc:"Қуаныш, мұң, ашу және тыныштық",feelAction:"Айту",kindMessage:"Асығудың қажеті жоқ. Өзіңе ыңғайлы қарқынмен үйреніп, ойна.",navHome:"Басты бет",navProgress:"Жетістіктер",navParents:"Ата-аналарға",navSpecialist:"Маманға",coming:"Бұл бөлім келесі кезеңде қосылады. Қазір МОГУ қосымшасының негізін жасап жатырмыз.",home:"Басты бет"},
en:{tagline:"Learn • Speak • Play",welcome:"Hello! We're happy you're here",littleSteps:"Little steps — big discoveries",hello:"Hello!",welcomeText:"A place to communicate, learn and discover new things. You can do it, at your own pace.",youCan:"You can do more than you think!",choosePath:"CHOOSE YOUR ADVENTURE",whereStart:"Where shall we start?",tapCard:"Tap a card",talkTitle:"I want to say",talkDesc:"Communicate with picture cards",start:"Start",learnTitle:"I learn",learnDesc:"Speech, letters, numbers and shapes",explore:"Explore",worldTitle:"The world around me",worldDesc:"Animals, nature and transport",discover:"Discover",feelTitle:"My feelings",feelDesc:"Happy, sad, angry and calm",feelAction:"Tell me",kindMessage:"There's no need to hurry. Learn and play at your own pace.",navHome:"Home",navProgress:"Progress",navParents:"For parents",navSpecialist:"For specialists",coming:"This section will be added in a later stage. We're building the MOGU foundation now.",home:"Home"}
};
let currentLang = "ru";
let toastTimer;
function showToast(message){
 const toast=document.getElementById("toast");
 toast.textContent=message;toast.classList.add("is-visible");
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("is-visible"),2600);
}
function setLanguage(lang){
 if(!translations[lang])return;
 currentLang=lang;document.documentElement.lang=lang;
 document.querySelectorAll("[data-i18n]").forEach(el=>{
  const key=el.dataset.i18n;if(translations[lang][key])el.textContent=translations[lang][key];
 });
 document.querySelectorAll(".lang-button").forEach(button=>{
  const active=button.dataset.lang===lang;button.classList.toggle("is-active",active);button.setAttribute("aria-pressed",String(active));
 });
 try{localStorage.setItem("mogu-language",lang)}catch(_){}
}
document.querySelectorAll(".lang-button").forEach(button=>button.addEventListener("click",()=>setLanguage(button.dataset.lang)));
document.querySelectorAll(".feature-card").forEach(button=>button.addEventListener("click",()=>showToast(translations[currentLang].coming)));
document.querySelectorAll(".nav-item").forEach(button=>button.addEventListener("click",()=>{
 if(button.dataset.nav!=="home"){
  showToast(translations[currentLang].coming);
  return;
 }
 document.querySelectorAll(".nav-item").forEach(item=>{item.classList.remove("is-current");item.removeAttribute("aria-current")});
 button.classList.add("is-current");button.setAttribute("aria-current","page");
 window.scrollTo({top:0,behavior:"smooth"});
}));
try{const saved=localStorage.getItem("mogu-language");if(saved&&translations[saved])setLanguage(saved)}catch(_){}
if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
