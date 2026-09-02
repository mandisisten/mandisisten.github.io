/* Editor de corpo da matéria: uma <textarea> simples com botões que inserem
   HTML restrito. Sem editor rico — isso quebra no teclado do celular. */

function editorEnvolverSelecao(textarea, antes, depois) {
  var inicio = textarea.selectionStart;
  var fim = textarea.selectionEnd;
  var valor = textarea.value;
  var selecionado = valor.slice(inicio, fim) || "texto";
  var novoValor = valor.slice(0, inicio) + antes + selecionado + depois + valor.slice(fim);
  textarea.value = novoValor;
  textarea.focus();
  textarea.setSelectionRange(inicio + antes.length, inicio + antes.length + selecionado.length);
}

function editorAcaoLista(textarea, ordenada) {
  var inicio = textarea.selectionStart;
  var fim = textarea.selectionEnd;
  var valor = textarea.value;
  var selecionado = valor.slice(inicio, fim) || "primeiro item\nsegundo item";
  var linhas = selecionado.split("\n").filter(function (l) { return l.trim(); });
  var tag = ordenada ? "ol" : "ul";
  var html = "<" + tag + ">\n" + linhas.map(function (l) { return "<li>" + l.trim() + "</li>"; }).join("\n") + "\n</" + tag + ">";
  textarea.value = valor.slice(0, inicio) + html + valor.slice(fim);
  textarea.focus();
}

function editorAcaoLink(textarea) {
  var url = prompt("Endereço do link (https://...)");
  if (!url) return;
  editorEnvolverSelecao(textarea, '<a href="' + url + '">', "</a>");
}

function ligarBarraFerramentas(container, textarea) {
  container.querySelectorAll("[data-acao]").forEach(function (botao) {
    botao.addEventListener("click", function (ev) {
      ev.preventDefault();
      var acao = botao.getAttribute("data-acao");
      if (acao === "negrito") editorEnvolverSelecao(textarea, "<strong>", "</strong>");
      else if (acao === "italico") editorEnvolverSelecao(textarea, "<em>", "</em>");
      else if (acao === "link") editorAcaoLink(textarea);
      else if (acao === "intertitulo") editorEnvolverSelecao(textarea, "<h2>", "</h2>");
      else if (acao === "citacao") editorEnvolverSelecao(textarea, "<blockquote><p>", "</p></blockquote>");
      else if (acao === "lista") editorAcaoLista(textarea, false);
      else if (acao === "lista-numerada") editorAcaoLista(textarea, true);
    });
  });
}

/* Transforma texto solto em blocos <p>, preservando tags de bloco que o
   autor já tenha inserido pelos botões da barra de ferramentas. */
var TAGS_DE_BLOCO = ["<h2", "<h3", "<ul", "<ol", "<blockquote", "<figure", "<p"];

function prepararCorpoHtml(textoBruto) {
  var blocos = (textoBruto || "").split(/\n\s*\n/).map(function (b) { return b.trim(); }).filter(Boolean);
  var html = blocos
    .map(function (bloco) {
      var jaEhBloco = TAGS_DE_BLOCO.some(function (t) { return bloco.indexOf(t) === 0; });
      if (jaEhBloco) return bloco;
      return "<p>" + bloco.replace(/\n/g, "<br>") + "</p>";
    })
    .join("\n");
  return sanitizarCorpo(html);
}
