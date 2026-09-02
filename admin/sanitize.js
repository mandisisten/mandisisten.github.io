/* Sanitização do HTML do corpo da matéria. Roda no navegador do painel,
   antes de gravar qualquer coisa no repositório. */
var SANITIZE_TAGS_PERMITIDAS = {
  p: [],
  br: [],
  strong: [],
  em: [],
  a: ["href", "title"],
  h2: [],
  h3: [],
  ul: [],
  ol: [],
  li: [],
  blockquote: [],
  figure: [],
  img: ["src", "alt", "width", "height", "loading"],
  figcaption: [],
};

function urlEhSegura(url) {
  if (!url) return false;
  var valor = url.trim().toLowerCase();
  if (valor.indexOf("javascript:") === 0) return false;
  if (valor.indexOf("data:") === 0 && valor.indexOf("data:image/") !== 0) return false;
  return true;
}

function sanitizarCorpo(htmlBruto) {
  var doc = new DOMParser().parseFromString("<div>" + (htmlBruto || "") + "</div>", "text/html");
  var raiz = doc.body.firstChild;

  function limpar(no) {
    var filhos = Array.prototype.slice.call(no.childNodes);
    filhos.forEach(function (filho) {
      if (filho.nodeType === Node.TEXT_NODE) return;
      if (filho.nodeType !== Node.ELEMENT_NODE) {
        no.removeChild(filho);
        return;
      }
      var tag = filho.tagName.toLowerCase();
      if (!SANITIZE_TAGS_PERMITIDAS.hasOwnProperty(tag)) {
        var texto = doc.createTextNode(filho.textContent);
        no.replaceChild(texto, filho);
        return;
      }
      var atributosPermitidos = SANITIZE_TAGS_PERMITIDAS[tag];
      Array.prototype.slice.call(filho.attributes).forEach(function (attr) {
        var nome = attr.name.toLowerCase();
        if (nome.indexOf("on") === 0 || atributosPermitidos.indexOf(nome) === -1) {
          filho.removeAttribute(attr.name);
          return;
        }
        if ((nome === "href" || nome === "src") && !urlEhSegura(attr.value)) {
          filho.removeAttribute(attr.name);
        }
      });
      if (tag === "a") {
        filho.setAttribute("rel", "noopener noreferrer");
      }
      limpar(filho);
    });
  }

  limpar(raiz);
  return raiz.innerHTML;
}
