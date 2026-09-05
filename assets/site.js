/* Sul Metropolitano — comportamento do site publicado.
   Só cuida de busca, menu e compartilhar. Nenhuma informação essencial
   do conteúdo depende deste arquivo: tudo já está no HTML gerado. */
(function () {
  "use strict";

  var CONFIG = {
    site: {
      nome: "Sul Metropolitano",
      dominio: "https://sulmetropolitano.com.br",
    },
  };

  function raiz() {
    var base = document.querySelector('meta[name="site-raiz"]');
    return base ? base.getAttribute("content") : "/";
  }

  /* ---------- menu ---------- */
  function initMenu() {
    var botao = document.querySelector("[data-abrir-menu]");
    var alvo = document.querySelector("[data-menu-completo]");
    if (!botao || !alvo) return;
    botao.addEventListener("click", function () {
      var aberto = alvo.hasAttribute("open");
      if (aberto) {
        alvo.removeAttribute("open");
      } else {
        alvo.setAttribute("open", "");
      }
      botao.setAttribute("aria-expanded", String(!aberto));
    });
  }

  /* ---------- dropdown "Municípios" ----------
     O <details> já funciona por toque/clique sem nenhum JS. Em telas com
     mouse de verdade, isso aqui só soma o hover, que é o comportamento
     esperado nesse tipo de dispositivo. Toque continua abrindo/fechando
     do jeito nativo, sem interferência. */
  function initDropdownMunicipios() {
    var dropdown = document.querySelector("[data-dropdown-municipios]");
    if (!dropdown || !window.matchMedia) return;
    var temMousePreciso = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!temMousePreciso) return;

    var timer = null;
    dropdown.addEventListener("mouseenter", function () {
      clearTimeout(timer);
      dropdown.setAttribute("open", "");
    });
    dropdown.addEventListener("mouseleave", function () {
      timer = setTimeout(function () { dropdown.removeAttribute("open"); }, 200);
    });
  }

  /* fecha qualquer <details> de menu ao clicar fora dele. Cuidado: o botão
     que ABRE um <details> (ex.: o hambúrguer) fica FORA dele no HTML — sem
     essa exceção, o próprio clique de abrir fecharia o painel na hora. */
  function initFecharAoClicarFora() {
    document.addEventListener("click", function (ev) {
      document.querySelectorAll("details[open]").forEach(function (det) {
        if (det.contains(ev.target)) return;
        if (det.id) {
          var botao = document.querySelector('[aria-controls="' + det.id + '"]');
          if (botao && botao.contains(ev.target)) return;
        }
        det.removeAttribute("open");
      });
    });
  }

  /* ---------- aba ativa no menu ---------- */
  function initNavAtiva() {
    var caminho = location.pathname;
    document.querySelectorAll(".nav-principal > a[href]").forEach(function (link) {
      var href = link.getAttribute("href");
      var ehAtual = href === "/" ? caminho === "/" || /\/index\.html$/.test(caminho) : caminho.indexOf(href) === 0;
      if (ehAtual) link.classList.add("ativo");
    });
  }

  /* ---------- compartilhar ---------- */
  function initCompartilhar() {
    var botoes = document.querySelectorAll("[data-compartilhar]");
    botoes.forEach(function (botao) {
      botao.addEventListener("click", function (ev) {
        var url = botao.getAttribute("data-url") || location.href;
        var titulo = botao.getAttribute("data-titulo") || document.title;
        if (navigator.share) {
          ev.preventDefault();
          navigator.share({ title: titulo, url: url }).catch(function () {});
        }
        /* sem navigator.share, o botão já é um link wa.me normal */
      });
    });
  }

  /* ---------- busca ---------- */
  var indice = null;
  var carregandoIndice = null;

  function carregarIndice() {
    if (indice) return Promise.resolve(indice);
    if (carregandoIndice) return carregandoIndice;
    carregandoIndice = fetch(raiz() + "dados/index.json")
      .then(function (r) { return r.json(); })
      .then(function (dados) {
        indice = dados;
        return dados;
      })
      .catch(function () {
        indice = [];
        return indice;
      });
    return carregandoIndice;
  }

  function normalizar(texto) {
    return (texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function buscar(termo, itens) {
    var alvo = normalizar(termo);
    if (!alvo) return [];
    return itens
      .filter(function (item) {
        return (
          normalizar(item.titulo).indexOf(alvo) !== -1 ||
          normalizar(item.resumo).indexOf(alvo) !== -1 ||
          normalizar(item.cidade).indexOf(alvo) !== -1
        );
      })
      .slice(0, 20);
  }

  function initBusca() {
    var botaoAbrir = document.querySelector("[data-abrir-busca]");
    var painel = document.querySelector("[data-painel-busca]");
    var campo = document.querySelector("[data-campo-busca]");
    var resultados = document.querySelector("[data-resultados-busca]");
    if (!botaoAbrir || !painel || !campo || !resultados) return;

    botaoAbrir.addEventListener("click", function () {
      var estavaAberto = !painel.hasAttribute("hidden");
      if (estavaAberto) {
        painel.setAttribute("hidden", "");
        botaoAbrir.setAttribute("aria-expanded", "false");
        return;
      }
      painel.removeAttribute("hidden");
      botaoAbrir.setAttribute("aria-expanded", "true");
      campo.focus();
      carregarIndice();
    });

    var timer = null;
    campo.addEventListener("input", function () {
      clearTimeout(timer);
      var termo = campo.value;
      timer = setTimeout(function () {
        if (!termo.trim()) {
          resultados.innerHTML = "";
          return;
        }
        carregarIndice().then(function (itens) {
          var achados = buscar(termo, itens);
          if (!achados.length) {
            resultados.innerHTML = '<p class="busca-vazio">Nada encontrado. Tente outro termo ou o nome da cidade.</p>';
            return;
          }
          resultados.innerHTML = achados
            .map(function (item) {
              return (
                '<a class="busca-resultado" href="' + raiz() + "n/" + item.slug + '/">' +
                '<span class="busca-resultado-titulo">' + escaparHtml(item.titulo) + "</span>" +
                '<span class="busca-resultado-meta"> — ' + escaparHtml(item.cidade) + "</span>" +
                "</a>"
              );
            })
            .join("");
        });
      }, 150);
    });
  }

  function escaparHtml(texto) {
    var div = document.createElement("div");
    div.textContent = texto || "";
    return div.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", function () {
    initMenu();
    initDropdownMunicipios();
    initFecharAoClicarFora();
    initNavAtiva();
    initCompartilhar();
    initBusca();
  });
})();
