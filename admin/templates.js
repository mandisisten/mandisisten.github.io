/* Geração de todo o HTML publicado no site, a partir dos dados em /dados/.
   Este arquivo é a única fonte da aparência estrutural das páginas — trocar
   a aparência visual é trabalho do assets/site.css, não daqui. */

var SITE_DOMINIO = CONFIG.site.dominio;

/* ---------- utilidades ---------- */

function escaparHtmlAdmin(texto) {
  return (texto == null ? "" : String(texto))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

var MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatarDataLegivel(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  return d.getDate() + " de " + MESES_PT[d.getMonth()] + " de " + d.getFullYear();
}

function formatarDataHoraLegivel(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  var hh = String(d.getHours()).padStart(2, "0");
  var mm = String(d.getMinutes()).padStart(2, "0");
  return formatarDataLegivel(iso) + " às " + hh + "h" + mm;
}

function cidadeInfo(slug) {
  return CONFIG.cidades.find(function (c) { return c.slug === slug; }) || { slug: slug, nome: slug };
}

function urlAbsoluta(caminho) {
  return SITE_DOMINIO.replace(/\/$/, "") + caminho;
}

function urlMateria(slug) {
  return "/n/" + slug + "/";
}

function urlCidade(slug, pagina) {
  return "/" + slug + "/" + (pagina && pagina > 1 ? pagina + "/" : "");
}

function urlEditoria(slugEd, pagina) {
  return "/editoria/" + slugEd + "/" + (pagina && pagina > 1 ? pagina + "/" : "");
}

/* ---------- vídeo (YouTube) ---------- */

function extrairYoutubeId(url) {
  if (!url) return null;
  var m = String(url).match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  return m ? m[1] : null;
}

function youtubeThumb(id) {
  return "https://img.youtube.com/vi/" + id + "/hqdefault.jpg";
}

function renderVideoEmbed(id, titulo) {
  return (
    '<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/' + id +
    '" title="' + escaparHtmlAdmin(titulo || "Vídeo") +
    '" loading="lazy" allow="encrypted-media; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'
  );
}

function renderVideoCard(m) {
  var id = extrairYoutubeId(m.video);
  if (!id) return "";
  return (
    '<a class="video-card" href="' + urlMateria(m.slug) + '">' +
    '<span class="video-card-thumb"><img src="' + youtubeThumb(id) + '" alt="" width="480" height="360" loading="lazy">' +
    '<span class="video-card-play" aria-hidden="true">▶</span></span>' +
    '<span class="video-card-titulo">' + escaparHtmlAdmin(m.titulo) + "</span>" +
    "</a>"
  );
}

function renderBlocoVideos(index) {
  var comVideo = index.filter(function (m) { return m.video && extrairYoutubeId(m.video); }).slice(0, 3);
  if (!comVideo.length) return "";
  return (
    '<section class="bloco-videos">\n' +
    "  <h2>Vídeos</h2>\n" +
    '  <div class="grade-videos">' + comVideo.map(renderVideoCard).join("") + "</div>\n" +
    "</section>\n"
  );
}

function etiquetaCidade(slug, opts) {
  opts = opts || {};
  var info = cidadeInfo(slug);
  var tag = opts.link === false ? "span" : "a";
  var href = opts.link === false ? "" : ' href="' + urlCidade(slug) + '"';
  return "<" + tag + href + ' class="kicker">' + escaparHtmlAdmin(info.nome) + "</" + tag + ">";
}

/* data curta ("2 de set") — usada em metadados de lista, mais compacta que
   formatarDataLegivel sem virar texto relativo que envelhece mal numa
   página estática (ver formatarRelativo, usado só na barra lateral). */
var MESES_ABREV_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function formatarDataCurta(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  return d.getDate() + " de " + MESES_ABREV_PT[d.getMonth()];
}

/* "hoje" / "ontem" / "há N dias" — só para o widget "Nas cidades" da barra
   lateral. A home é regerada a cada publicação (de qualquer cidade), então
   o rótulo fica razoavelmente fresco; ainda assim é só um resumo rápido,
   não a data de registro (que continua absoluta em todo o resto do site). */
function formatarRelativo(iso) {
  if (!iso) return "";
  var dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return "há " + dias + " dias";
}

/* ---------- cabeçalho de página (<head>) ---------- */

function renderHead(opts) {
  var titulo = opts.semSufixo ? opts.titulo : opts.titulo + " — " + CONFIG.site.nome;
  var descricao = escaparHtmlAdmin(opts.descricao || CONFIG.site.assinatura);
  var canonical = urlAbsoluta(opts.caminho);
  var imagem = opts.imagem ? urlAbsoluta(opts.imagem) : urlAbsoluta("/assets/logo.svg");
  var tipo = opts.tipo || "website";

  var extra = "";
  if (opts.noindex) {
    extra += '\n  <meta name="robots" content="noindex">';
  }
  if (opts.jsonLd) {
    extra += '\n  <script type="application/ld+json">' + JSON.stringify(opts.jsonLd) + "</script>";
  }

  return (
    "<!doctype html>\n" +
    '<html lang="pt-BR">\n' +
    "<head>\n" +
    '  <meta charset="utf-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    "  <title>" + escaparHtmlAdmin(titulo) + "</title>\n" +
    '  <meta name="description" content="' + descricao + '">\n' +
    '  <link rel="canonical" href="' + canonical + '">\n' +
    '  <meta name="site-raiz" content="/">\n' +
    '  <link rel="stylesheet" href="/assets/site.css">\n' +
    '  <link rel="icon" href="/assets/logo.svg" type="image/svg+xml">\n' +
    '  <meta property="og:site_name" content="' + escaparHtmlAdmin(CONFIG.site.nome) + '">\n' +
    '  <meta property="og:type" content="' + tipo + '">\n' +
    '  <meta property="og:title" content="' + escaparHtmlAdmin(opts.titulo) + '">\n' +
    '  <meta property="og:description" content="' + descricao + '">\n' +
    '  <meta property="og:url" content="' + canonical + '">\n' +
    '  <meta property="og:image" content="' + imagem + '">\n' +
    '  <meta name="twitter:card" content="summary_large_image">\n' +
    '  <meta name="twitter:title" content="' + escaparHtmlAdmin(opts.titulo) + '">\n' +
    '  <meta name="twitter:description" content="' + descricao + '">\n' +
    '  <meta name="twitter:image" content="' + imagem + '">' +
    extra +
    "\n</head>\n"
  );
}

/* ---------- cabeçalho visual + rodapé (compartilhados) ---------- */

var ITENS_MENU_PRINCIPAL = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Sobre", href: "/sobre/" },
  { rotulo: "Política", href: "/editoria/politica/" },
  { rotulo: "Agenda Regional", href: "/agenda/" },
  { rotulo: "Cultura", href: "/editoria/cultura-e-lazer/" },
  { rotulo: "Esporte", href: "/editoria/esporte/" },
  { rotulo: "Emprego", href: "/vagas/" },
  { rotulo: "Guia Sul", href: "/guia/" },
  { rotulo: "Fale Conosco", href: "/fale-conosco/" },
];

/* Editorias e páginas que não entraram no menu principal — ficam no
   menu "Mais assuntos" (☰), para não sobrecarregar a barra curada. */
var EDITORIAS_FORA_DO_MENU = ["Polícia", "Economia e Emprego", "Saúde e Educação", "Utilidade Pública"];
var PAGINAS_FORA_DO_MENU = [
  { rotulo: "Anuncie", href: "/anuncie/" },
  { rotulo: "Expediente", href: "/expediente/" },
  { rotulo: "Privacidade", href: "/privacidade/" },
];

function renderCabecalho() {
  var linksCidades = CONFIG.cidades
    .map(function (c) { return "<li><a href=\"" + urlCidade(c.slug) + "\">" + escaparHtmlAdmin(c.nome) + "</a></li>"; })
    .join("");

  // "Início" e o dropdown de Municípios ficam fixos, sempre visíveis; o
  // resto do menu vai numa faixa que rola horizontalmente no celular — sem
  // isso, o dropdown de Municípios ficaria cortado dentro da área de rolagem.
  var linkInicio = '<a href="' + ITENS_MENU_PRINCIPAL[0].href + '">' + escaparHtmlAdmin(ITENS_MENU_PRINCIPAL[0].rotulo) + "</a>";
  var dropdownMunicipios =
    '<details class="nav-dropdown" data-dropdown-municipios>\n' +
    "  <summary>Municípios</summary>\n" +
    '  <ul class="nav-dropdown-lista">' + linksCidades + "</ul>\n" +
    "</details>\n";
  var itensRolagem = ITENS_MENU_PRINCIPAL.slice(1)
    .map(function (item) { return '<a href="' + item.href + '">' + escaparHtmlAdmin(item.rotulo) + "</a>"; })
    .join("");
  var itensPrincipais = linkInicio + dropdownMunicipios + '<div class="nav-scroll">' + itensRolagem + "</div>";

  var maisEditorias = EDITORIAS_FORA_DO_MENU
    .map(function (e) { return '<a href="' + urlEditoria(editoriaSlug(e)) + '">' + escaparHtmlAdmin(e) + "</a>"; })
    .join("");
  var maisPaginas = PAGINAS_FORA_DO_MENU
    .map(function (p) { return '<a href="' + p.href + '">' + escaparHtmlAdmin(p.rotulo) + "</a>"; })
    .join("");

  return (
    '<header class="topo">\n' +
    '  <div class="container topo-linha">\n' +
    '    <a class="marca" href="/">\n' +
    '      <span class="marca-nome">' + escaparHtmlAdmin(CONFIG.site.nome) + "</span>\n" +
    '      <span class="marca-assinatura">' + escaparHtmlAdmin(CONFIG.site.assinatura) + "</span>\n" +
    "    </a>\n" +
    '    <div class="topo-acoes">\n' +
    '      <button type="button" class="botao-busca" data-abrir-busca aria-expanded="false" aria-controls="busca-painel">\n' +
    '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>\n' +
    '        <span class="botao-busca-texto">Buscar no site</span>\n' +
    "      </button>\n" +
    '      <button type="button" class="botao-icone" data-abrir-menu aria-expanded="false" aria-controls="menu-completo" title="Mais assuntos">\n' +
    '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>\n' +
    '        <span class="apenas-leitor">Mais assuntos</span>\n' +
    "      </button>\n" +
    "    </div>\n" +
    "  </div>\n" +
    '  <nav class="nav-principal container" aria-label="Principal">' + itensPrincipais + "</nav>\n" +
    '  <div class="container busca-painel" data-painel-busca id="busca-painel" hidden>\n' +
    '    <label class="apenas-leitor" for="campo-busca">Buscar matérias</label>\n' +
    '    <input type="search" id="campo-busca" class="busca-campo" data-campo-busca placeholder="Buscar por título ou cidade…">\n' +
    '    <div class="busca-resultados" data-resultados-busca></div>\n' +
    "  </div>\n" +
    "</header>\n" +
    '<details class="menu-completo container" data-menu-completo id="menu-completo">\n' +
    "  <summary>Mais assuntos</summary>\n" +
    '  <div class="menu-completo-lista">' + maisEditorias + maisPaginas + "</div>\n" +
    "</details>\n"
  );
}

function renderRodape() {
  var ano = new Date().getFullYear();
  var nomesCidades = CONFIG.cidades.map(function (c) { return c.nome; }).join(", ");
  var contatos = "";
  if (CONFIG.site.whatsapp) contatos += '<li><a href="https://wa.me/' + CONFIG.site.whatsapp.replace(/\D/g, "") + '">WhatsApp</a></li>';
  if (CONFIG.site.instagram) contatos += '<li><a href="' + escaparHtmlAdmin(CONFIG.site.instagram) + '">Instagram</a></li>';
  contatos += '<li><a href="mailto:' + escaparHtmlAdmin(CONFIG.site.emailRedacao) + '">' + escaparHtmlAdmin(CONFIG.site.emailRedacao) + "</a></li>";

  return (
    '<footer class="rodape">\n' +
    '  <div class="container cols">\n' +
    "    <div>\n" +
    "      <strong>" + escaparHtmlAdmin(CONFIG.site.nome) + "</strong>\n" +
    "      Jornalismo local em " + escaparHtmlAdmin(nomesCidades) + ".\n" +
    "    </div>\n" +
    '    <div><ul>\n' +
    '      <li><a href="/sobre/">Sobre</a></li>\n' +
    '      <li><a href="/expediente/">Expediente</a></li>\n' +
    '      <li><a href="/anuncie/">Anuncie</a></li>\n' +
    '      <li><a href="/guia/">Guia Sul</a></li>\n' +
    '      <li><a href="/privacidade/">Privacidade</a></li>\n' +
    "    </ul></div>\n" +
    "    <div><ul>" + contatos + "</ul></div>\n" +
    "  </div>\n" +
    '  <div class="container legal">\n' +
    "    <p>© " + ano + " " + escaparHtmlAdmin(CONFIG.site.nome) + " · <a href=\"/expediente/\">expediente</a></p>\n" +
    '    <p class="rodape-cookies">Este site pode usar cookies de publicidade para exibir anúncios relevantes. Veja nossa <a href="/privacidade/">política de privacidade</a>.</p>\n' +
    "  </div>\n" +
    "</footer>\n" +
    '<script src="/assets/site.js"></script>\n'
  );
}

function reservaAnuncio(rotulo) {
  return '<div class="reserva-anuncio" data-anuncio="' + escaparHtmlAdmin(rotulo) + '">espaço publicitário</div>';
}

function envolverPagina(head, corpoHtml) {
  return head + "<body>\n" + renderCabecalho() + corpoHtml + renderRodape() + "</body>\n</html>\n";
}

/* ---------- itens de lista ---------- */

function renderMiniaturaItem(m) {
  var videoId = extrairYoutubeId(m.video);
  var src = m.imagem || (videoId ? youtubeThumb(videoId) : null);
  if (!src) return '<div class="thumb"></div>';
  return '<div class="thumb"><img src="' + src + '" alt="" loading="lazy" width="158" height="104"></div>';
}

function renderItemLista(m) {
  return (
    '<article class="item">\n' +
    '  <div class="txt">\n' +
    "    " + etiquetaCidade(m.cidade) + "\n" +
    '    <h3 class="item-titulo"><a href="' + urlMateria(m.slug) + '">' + escaparHtmlAdmin(m.titulo) + "</a></h3>\n" +
    (m.resumo ? '    <p class="item-resumo">' + escaparHtmlAdmin(m.resumo) + "</p>\n" : "") +
    '    <p class="item-data">' +
    (m.urgente ? '<span class="etiqueta-urgente">Urgente</span> · ' : "") +
    escaparHtmlAdmin(m.editoria) +
    (m.video ? " · ▶ Vídeo" : "") +
    ' · <time datetime="' + m.publicadoEm + '">' + formatarDataCurta(m.publicadoEm) + "</time></p>\n" +
    "  </div>\n" +
    "  " + renderMiniaturaItem(m) + "\n" +
    "</article>\n"
  );
}

function renderListaMaterias(itens) {
  if (!itens.length) return "";
  return '<div class="lista">' + itens.map(renderItemLista).join("") + "</div>";
}

/* ---------- home ---------- */

function renderManchete(m) {
  var videoId = extrairYoutubeId(m.video);
  var imagemSrc = m.imagem || (videoId ? youtubeThumb(videoId) : null);
  return (
    '<section class="manchete">\n' +
    (imagemSrc
      ? '  <a href="' + urlMateria(m.slug) + '" class="manchete-imagem-link"><img class="manchete-imagem" src="' + imagemSrc +
        '" alt="' + escaparHtmlAdmin(m.imagemAlt || "") + '" width="960" height="540" loading="eager" fetchpriority="high">' +
        (videoId && !m.imagem ? '<span class="video-card-play" aria-hidden="true">▶</span>' : "") + "</a>\n"
      : "") +
    "  " + etiquetaCidade(m.cidade) + "\n" +
    '  <h1 class="manchete-titulo"><a href="' + urlMateria(m.slug) + '">' + escaparHtmlAdmin(m.titulo) + "</a></h1>\n" +
    (m.resumo ? '  <p class="manchete-resumo">' + escaparHtmlAdmin(m.resumo) + "</p>\n" : "") +
    '  <p class="assino">Por ' + escaparHtmlAdmin(m.autor || CONFIG.site.nome) + " · " + formatarDataCurta(m.publicadoEm) + "</p>\n" +
    "</section>\n"
  );
}

function renderTarjaUrgente(m) {
  if (!m) return "";
  return (
    '<div class="tarja-urgente">\n' +
    '  <a class="container" href="' + urlMateria(m.slug) + '"><span class="rotulo">Urgente:</span>' +
    escaparHtmlAdmin(m.titulo) + "</a>\n" +
    "</div>\n"
  );
}

/* widget "Mais notícias" — as matérias mais recentes fora a manchete,
   com miniatura pequena. Fica no topo da barra lateral, ao lado da
   matéria principal. */
var RELOGIO_SVG =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';

function renderBarraMaisNoticias(index, manchete) {
  var itens = index.filter(function (m) { return !manchete || m.slug !== manchete.slug; }).slice(0, 3);
  if (!itens.length) return "";
  var linhas = itens
    .map(function (m) {
      var videoId = extrairYoutubeId(m.video);
      var src = m.imagem || (videoId ? youtubeThumb(videoId) : null);
      var thumb = src
        ? '<span class="noticia-mini-thumb"><img src="' + src + '" alt="" loading="lazy" width="96" height="80"></span>'
        : '<span class="noticia-mini-thumb"></span>';
      return (
        '<a class="noticia-mini" href="' + urlMateria(m.slug) + '">' +
        "  " + etiquetaCidade(m.cidade, { link: false }) + "\n" +
        '  <span class="noticia-mini-linha">' +
        '<span class="noticia-mini-info">' +
        '<span class="t">' + escaparHtmlAdmin(m.titulo) + "</span>" +
        '<span class="s">' + RELOGIO_SVG + " " + formatarDataLegivel(m.publicadoEm) + "</span>" +
        "</span>" +
        thumb +
        "</span>" +
        "</a>"
      );
    })
    .join("");
  return '<section><h4>Mais notícias</h4>' + linhas + "</section>";
}

/* widget "Nas cidades" da barra lateral: uma linha por cidade, nome +
   recência da última matéria. */
function renderBarraNasCidades(index) {
  var linhas = CONFIG.cidades
    .map(function (c) {
      var ultima = index.find(function (m) { return m.cidade === c.slug; });
      var quando = ultima
        ? '<span class="quando">' + formatarRelativo(ultima.publicadoEm) + "</span>"
        : '<span class="quando">sem matéria</span>';
      var href = ultima ? urlMateria(ultima.slug) : urlCidade(c.slug);
      return (
        '<a class="cidade-linha" href="' + href + '">' +
        '<span class="nome">' + escaparHtmlAdmin(c.nome) + "</span>" + quando +
        "</a>"
      );
    })
    .join("");
  return '<section><h4>Nas cidades</h4>' + linhas + "</section>";
}

/* widget "Vagas de emprego" — as mais recentes ainda ativas. */
function renderBarraVagas(vagas) {
  var ativas = (vagas || [])
    .filter(function (v) { return !v.expiraEm || new Date(v.expiraEm) >= new Date(); })
    .sort(function (a, b) { return new Date(b.publicadoEm) - new Date(a.publicadoEm); })
    .slice(0, 3);
  if (!ativas.length) return "";
  var linhas = ativas
    .map(function (v) {
      return (
        '<a class="mini" href="/vagas/">' +
        '<span class="t">' + escaparHtmlAdmin(v.titulo) + "</span>" +
        '<span class="s">' + escaparHtmlAdmin(cidadeInfo(v.cidade).nome) + (v.empresa ? " · " + escaparHtmlAdmin(v.empresa) : "") + "</span>" +
        "</a>"
      );
    })
    .join("");
  return '<section><h4>Vagas de emprego</h4>' + linhas + "</section>";
}

/* widget "Vídeo" — a matéria com vídeo mais recente. */
function renderBarraVideo(index) {
  var m = (index || []).find(function (item) { return item.video && extrairYoutubeId(item.video); });
  if (!m) return "";
  return '<section><h4>Vídeo</h4>' + renderVideoCard(m) + "</section>";
}

/* widget "Agenda" — próximos eventos. */
function renderBarraAgenda(agenda) {
  var hoje = new Date(new Date().toDateString());
  var proximos = (agenda || [])
    .filter(function (e) { return !e.data || new Date(e.data) >= hoje; })
    .sort(function (a, b) { return new Date(a.data) - new Date(b.data); })
    .slice(0, 3);
  if (!proximos.length) return "";
  var linhas = proximos
    .map(function (e) {
      return (
        '<a class="mini" href="/agenda/">' +
        '<span class="t">' + escaparHtmlAdmin(e.titulo) + "</span>" +
        '<span class="s">' + formatarDataCurta(e.data) + " · " + escaparHtmlAdmin(cidadeInfo(e.cidade).nome) + "</span>" +
        "</a>"
      );
    })
    .join("");
  return '<section><h4>Agenda</h4>' + linhas + "</section>";
}

function renderBarraLateralHome(index, vagas, agenda, manchete) {
  return (
    "<aside>\n" +
    renderBarraMaisNoticias(index, manchete) +
    renderBarraNasCidades(index) +
    '<section>' + reservaAnuncio("home-lateral") + "</section>\n" +
    renderBarraVideo(index) +
    renderBarraVagas(vagas) +
    renderBarraAgenda(agenda) +
    "</aside>\n"
  );
}

function renderPaginaHome(index, vagas, agenda) {
  var head = renderHead({
    titulo: CONFIG.site.nome + " — " + CONFIG.site.assinatura,
    semSufixo: true,
    descricao: CONFIG.site.assinatura,
    caminho: "/",
    tipo: "website",
  });

  if (!index.length) {
    var vazio =
      '<div class="container estado-vazio"><p>Ainda não há matérias publicadas. Assim que a primeira sair, ela aparece aqui.</p></div>';
    return envolverPagina(head, vazio);
  }

  var urgente = index.find(function (m) { return m.urgente; });
  var manchete = index.find(function (m) { return m.destaque; }) || index[0];
  var resto = index.filter(function (m) { return m.slug !== manchete.slug; });

  var corpo =
    renderTarjaUrgente(urgente && urgente.slug !== manchete.slug ? urgente : null) +
    "<main>\n" +
    '<div class="container grade">\n' +
    '<div class="coluna">\n' +
    renderManchete(manchete) +
    renderBlocoVideos(index) +
    renderListaMaterias(resto.slice(0, 20)) +
    "</div>\n" +
    renderBarraLateralHome(index, vagas, agenda, manchete) +
    "</div>\n" +
    "</main>\n";

  return envolverPagina(head, corpo);
}

/* ---------- cidade / editoria ---------- */

function renderPaginaListagem(opts) {
  var titulo = opts.titulo;
  var itens = opts.itens;
  var pagina = opts.pagina;
  var totalPaginas = opts.totalPaginas;
  var caminho = opts.caminho;
  var urlPagina = opts.urlPagina;
  var descricao = opts.descricao;

  var head = renderHead({ titulo: titulo, descricao: descricao, caminho: caminho, tipo: "website" });

  var listaHtml;
  if (!itens.length) {
    listaHtml =
      '<div class="estado-vazio"><p>' + (opts.vazio || "Ainda não publicamos matérias aqui. Volte em breve.") + "</p></div>";
  } else {
    listaHtml = renderListaMaterias(itens);
  }

  var paginacaoHtml = "";
  if (totalPaginas > 1) {
    var anterior = pagina > 1 ? '<a href="' + urlPagina(pagina - 1) + '">← Mais recentes</a>' : '<span class="desabilitado">← Mais recentes</span>';
    var proxima = pagina < totalPaginas ? '<a href="' + urlPagina(pagina + 1) + '">Mais antigas →</a>' : '<span class="desabilitado">Mais antigas →</span>';
    paginacaoHtml = '<nav class="paginacao container" aria-label="Paginação">' + anterior + proxima + "</nav>";
  }

  var corpo =
    "<main>\n" +
    '  <div class="cabecalho-secao container"><h1>' + escaparHtmlAdmin(titulo) + "</h1></div>\n" +
    '  <div class="container">' + listaHtml + "</div>\n" +
    paginacaoHtml +
    "</main>\n";

  return envolverPagina(head, corpo);
}

function renderPaginaCidade(cidadeSlug, itensDaCidade, pagina, totalPaginas) {
  var info = cidadeInfo(cidadeSlug);
  return renderPaginaListagem({
    titulo: info.nome,
    descricao: "Notícias de " + info.nome + " — " + CONFIG.site.assinatura,
    caminho: urlCidade(cidadeSlug, pagina),
    itens: itensDaCidade,
    pagina: pagina,
    totalPaginas: totalPaginas,
    urlPagina: function (p) { return urlCidade(cidadeSlug, p); },
    vazio: "Ainda não publicamos matérias de " + info.nome + ". Volte em breve, ou avise a redação se tiver uma pauta.",
  });
}

function renderPaginaEditoria(nomeEditoria, itensDaEditoria, pagina, totalPaginas) {
  var slugEd = editoriaSlug(nomeEditoria);
  return renderPaginaListagem({
    titulo: nomeEditoria,
    descricao: nomeEditoria + " — " + CONFIG.site.assinatura,
    caminho: urlEditoria(slugEd, pagina),
    itens: itensDaEditoria,
    pagina: pagina,
    totalPaginas: totalPaginas,
    urlPagina: function (p) { return urlEditoria(slugEd, p); },
    vazio: "Ainda não publicamos matérias em " + nomeEditoria + ".",
  });
}

/* ---------- matéria ---------- */

function renderPaginaMateria(m, relacionadas) {
  var jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: m.titulo,
    description: m.resumo,
    image: m.imagem ? [urlAbsoluta(m.imagem)] : undefined,
    datePublished: m.publicadoEm,
    dateModified: m.atualizadoEm || m.publicadoEm,
    author: [{ "@type": "Person", name: m.autor || CONFIG.site.nome }],
    publisher: {
      "@type": "Organization",
      name: CONFIG.site.nome,
      logo: { "@type": "ImageObject", url: urlAbsoluta("/assets/logo.svg") },
    },
    mainEntityOfPage: urlAbsoluta(urlMateria(m.slug)),
  };

  var head = renderHead({
    titulo: m.titulo,
    descricao: m.resumo,
    caminho: urlMateria(m.slug),
    imagem: m.imagem,
    tipo: "article",
    jsonLd: jsonLd,
  });

  var whatsappHref =
    "https://wa.me/?text=" + encodeURIComponent(m.titulo + " — " + urlAbsoluta(urlMateria(m.slug)));

  var relacionadasHtml = "";
  if (relacionadas && relacionadas.length) {
    relacionadasHtml =
      '<div class="relacionadas">\n' +
      "  <h4>Mais de " + escaparHtmlAdmin(cidadeInfo(m.cidade).nome) + "</h4>\n" +
      relacionadas
        .map(function (r) {
          return (
            '<a class="mini" href="' + urlMateria(r.slug) + '">' +
            '<span class="t">' + escaparHtmlAdmin(r.titulo) + "</span>" +
            '<span class="s">' + escaparHtmlAdmin(r.editoria) + " · " + formatarDataCurta(r.publicadoEm) + "</span>" +
            "</a>"
          );
        })
        .join("") +
      "</div>\n";
  }

  var kickerMateria =
    '<div class="kicker">' +
    (m.urgente ? '<span class="etiqueta-urgente">Urgente</span> · ' : "") +
    '<a href="' + urlCidade(m.cidade) + '">' + escaparHtmlAdmin(cidadeInfo(m.cidade).nome) + "</a> · " +
    escaparHtmlAdmin(m.editoria) +
    "</div>\n";

  var corpo =
    "<main>\n" +
    '<article class="materia container">\n' +
    '  <div class="materia-cabecalho">\n' +
    "    " + kickerMateria +
    '    <h1 class="materia-titulo">' + escaparHtmlAdmin(m.titulo) + "</h1>\n" +
    (m.resumo ? '    <p class="materia-resumo">' + escaparHtmlAdmin(m.resumo) + "</p>\n" : "") +
    '    <div class="credito">\n' +
    "      <span>Por " + escaparHtmlAdmin(m.autor || CONFIG.site.nome) + "</span>\n" +
    '      <span><time datetime="' + m.publicadoEm + '">' + formatarDataHoraLegivel(m.publicadoEm) + "</time></span>\n" +
    (m.atualizadoEm
      ? '      <span>Atualizado em <time datetime="' + m.atualizadoEm + '">' + formatarDataLegivel(m.atualizadoEm) + "</time></span>\n"
      : "") +
    "    </div>\n" +
    "  </div>\n" +
    (extrairYoutubeId(m.video)
      ? "  " + renderVideoEmbed(extrairYoutubeId(m.video), m.titulo) + "\n"
      : m.imagem
      ? '  <figure class="materia-imagem-wrap">\n' +
        '    <img src="' + m.imagem + '" alt="' + escaparHtmlAdmin(m.imagemAlt || "") +
        '" width="960" height="540" loading="eager" fetchpriority="high">\n' +
        (m.imagemCredito ? '    <figcaption class="materia-imagem-legenda">' + escaparHtmlAdmin(m.imagemCredito) + "</figcaption>\n" : "") +
        "  </figure>\n"
      : "") +
    '  <div class="materia-corpo">' + m.conteudo + "</div>\n" +
    "  " + reservaAnuncio("materia-fim") + "\n" +
    '  <div class="materia-compartilhar">\n' +
    '    <a class="botao-whatsapp" data-compartilhar data-url="' + urlAbsoluta(urlMateria(m.slug)) +
    '" data-titulo="' + escaparHtmlAdmin(m.titulo) + '" href="' + whatsappHref + '" target="_blank" rel="noopener">Compartilhar no WhatsApp</a>\n' +
    "  </div>\n" +
    "  " + relacionadasHtml +
    "</article>\n" +
    "</main>\n";

  return envolverPagina(head, corpo);
}

/* ---------- vagas / obituário / agenda ---------- */

function renderPaginaVagas(vagas) {
  var head = renderHead({ titulo: "Vagas de emprego", descricao: "Vagas de emprego nas sete cidades — " + CONFIG.site.assinatura, caminho: "/vagas/" });
  var ativas = vagas.filter(function (v) { return !v.expiraEm || new Date(v.expiraEm) >= new Date(); });
  ativas.sort(function (a, b) { return new Date(b.publicadoEm) - new Date(a.publicadoEm); });
  var lista = !ativas.length
    ? '<div class="estado-vazio"><p>Nenhuma vaga aberta no momento. Assim que surgir uma, ela aparece aqui.</p></div>'
    : '<ul class="lista-utilitaria">' +
      ativas
        .map(function (v) {
          return (
            "<li>" +
            '<p class="item-utilitario-titulo">' + escaparHtmlAdmin(v.titulo) + "</p>" +
            '<p class="item-utilitario-meta">' + escaparHtmlAdmin(v.empresa || "") + " · " + escaparHtmlAdmin(cidadeInfo(v.cidade).nome) + "</p>" +
            '<div class="item-utilitario-corpo">' + (v.descricao || "") + "</div>" +
            (v.contato ? '<p class="item-utilitario-meta">Contato: ' + escaparHtmlAdmin(v.contato) + "</p>" : "") +
            "</li>"
          );
        })
        .join("") +
      "</ul>";
  var corpo = "<main><div class=\"cabecalho-secao container\"><h1>Vagas de emprego</h1></div><div class=\"container\">" + lista + "</div></main>";
  return envolverPagina(head, corpo);
}

function renderPaginaObituario(obituarios) {
  var head = renderHead({ titulo: "Obituário", descricao: "Registro de falecimentos — " + CONFIG.site.assinatura, caminho: "/obituario/" });
  var itens = obituarios.slice().sort(function (a, b) { return new Date(b.publicadoEm) - new Date(a.publicadoEm); });
  var lista = !itens.length
    ? '<div class="estado-vazio"><p>Nenhum registro no momento.</p></div>'
    : '<ul class="lista-utilitaria">' +
      itens
        .map(function (o) {
          return (
            "<li>" +
            '<p class="item-utilitario-titulo">' + escaparHtmlAdmin(o.nome) + "</p>" +
            '<p class="item-utilitario-meta">' + escaparHtmlAdmin(cidadeInfo(o.cidade).nome) + " · " + formatarDataLegivel(o.publicadoEm) + "</p>" +
            '<div class="item-utilitario-corpo">' + (o.texto || "") + "</div>" +
            "</li>"
          );
        })
        .join("") +
      "</ul>";
  var corpo = "<main><div class=\"cabecalho-secao container\"><h1>Obituário</h1></div><div class=\"container\">" + lista + "</div></main>";
  return envolverPagina(head, corpo);
}

function renderPaginaAgenda(eventos) {
  var head = renderHead({ titulo: "Agenda", descricao: "Eventos nas sete cidades — " + CONFIG.site.assinatura, caminho: "/agenda/" });
  var ativos = eventos.filter(function (e) { return !e.data || new Date(e.data) >= new Date(new Date().toDateString()); });
  ativos.sort(function (a, b) { return new Date(a.data) - new Date(b.data); });
  var lista = !ativos.length
    ? '<div class="estado-vazio"><p>Nenhum evento programado no momento.</p></div>'
    : '<ul class="lista-utilitaria">' +
      ativos
        .map(function (e) {
          return (
            "<li>" +
            '<p class="item-utilitario-titulo">' + escaparHtmlAdmin(e.titulo) + "</p>" +
            '<p class="item-utilitario-meta">' + formatarDataLegivel(e.data) + " · " + escaparHtmlAdmin(cidadeInfo(e.cidade).nome) + (e.local ? " · " + escaparHtmlAdmin(e.local) : "") + "</p>" +
            '<div class="item-utilitario-corpo">' + (e.descricao || "") + "</div>" +
            "</li>"
          );
        })
        .join("") +
      "</ul>";
  var corpo = "<main><div class=\"cabecalho-secao container\"><h1>Agenda</h1></div><div class=\"container\">" + lista + "</div></main>";
  return envolverPagina(head, corpo);
}

function renderPaginaGuia(anunciantes) {
  var head = renderHead({ titulo: "Guia comercial", descricao: "Comércios e serviços das sete cidades — " + CONFIG.site.assinatura, caminho: "/guia/" });
  var ativos = anunciantes.filter(function (a) { return a.ativo !== false; });
  var corpo;
  if (!ativos.length) {
    corpo = '<div class="estado-vazio"><p>Nenhum anunciante cadastrado ainda. <a href="/anuncie/">Veja como anunciar aqui</a>.</p></div>';
  } else {
    var grupos = {};
    ativos.forEach(function (a) {
      var chave = a.cidade;
      grupos[chave] = grupos[chave] || [];
      grupos[chave].push(a);
    });
    corpo = Object.keys(grupos)
      .map(function (slugCidade) {
        var itens = grupos[slugCidade]
          .map(function (a) {
            var whats = a.whatsapp
              ? '<a class="botao-whatsapp" href="https://wa.me/' + a.whatsapp.replace(/\D/g, "") + '" target="_blank" rel="noopener">WhatsApp</a>'
              : "";
            return (
              '<div class="guia-item">' +
              "<div><span class=\"guia-item-nome\">" + escaparHtmlAdmin(a.nome) + "</span><br><span class=\"guia-item-categoria\">" + escaparHtmlAdmin(a.categoria || "") + "</span></div>" +
              whats +
              "</div>"
            );
          })
          .join("");
        return (
          '<div class="guia-grupo"><h2>' + escaparHtmlAdmin(cidadeInfo(slugCidade).nome) + "</h2>" + itens + "</div>"
        );
      })
      .join("");
  }
  return envolverPagina(head, "<main><div class=\"cabecalho-secao container\"><h1>Guia comercial</h1></div><div class=\"container\">" + corpo + "</div></main>");
}

/* ---------- institucionais ---------- */

function renderPaginaInstitucional(caminho, titulo, corpoHtml, descricao) {
  var head = renderHead({ titulo: titulo, descricao: descricao, caminho: caminho });
  var corpo =
    '<main><div class="pagina-institucional container"><h1>' + escaparHtmlAdmin(titulo) + "</h1>" + corpoHtml + "</div></main>";
  return envolverPagina(head, corpo);
}

function montarCorpoExpediente(config) {
  var linhas = [];
  if (config.responsavel) linhas.push("<p><strong>Responsável:</strong> " + escaparHtmlAdmin(config.responsavel) + "</p>");
  if (config.cnpj) linhas.push("<p><strong>CNPJ:</strong> " + escaparHtmlAdmin(config.cnpj) + "</p>");
  if (config.endereco) linhas.push("<p><strong>Endereço:</strong> " + escaparHtmlAdmin(config.endereco) + "</p>");
  return (config.expediente.corpo || "") + linhas.join("");
}

function renderPagina404() {
  var head = renderHead({ titulo: "Página não encontrada", descricao: "Página não encontrada", caminho: "/404.html", noindex: true });
  var corpo =
    '<main><div class="pagina-404"><h1>404</h1><p>Essa página não existe ou foi movida.</p><p><a href="/">Voltar para a home</a></p></div></main>';
  return envolverPagina(head, corpo);
}

/* ---------- sitemap / feed ---------- */

var PAGINAS_ESTATICAS = ["/sobre/", "/fale-conosco/", "/vagas/", "/obituario/", "/agenda/", "/guia/", "/anuncie/", "/privacidade/", "/expediente/"];

function renderSitemapXml(index) {
  var urls = ["/"].concat(CONFIG.cidades.map(function (c) { return urlCidade(c.slug); }));
  urls = urls.concat(CONFIG.editorias.map(function (e) { return urlEditoria(editoriaSlug(e)); }));
  urls = urls.concat(PAGINAS_ESTATICAS);
  urls = urls.concat(index.map(function (m) { return urlMateria(m.slug); }));
  var itens = urls.map(function (u) { return "  <url><loc>" + urlAbsoluta(u) + "</loc></url>"; }).join("\n");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + itens + "\n</urlset>\n";
}

function renderFeedXml(index) {
  var itens = index
    .slice(0, 30)
    .map(function (m) {
      return (
        "  <item>\n" +
        "    <title>" + escaparHtmlAdmin(m.titulo) + "</title>\n" +
        "    <link>" + urlAbsoluta(urlMateria(m.slug)) + "</link>\n" +
        "    <guid>" + urlAbsoluta(urlMateria(m.slug)) + "</guid>\n" +
        "    <pubDate>" + new Date(m.publicadoEm).toUTCString() + "</pubDate>\n" +
        "    <description>" + escaparHtmlAdmin(m.resumo || "") + "</description>\n" +
        "  </item>"
      );
    })
    .join("\n");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n' +
    "  <title>" + escaparHtmlAdmin(CONFIG.site.nome) + "</title>\n" +
    "  <link>" + SITE_DOMINIO + "/</link>\n" +
    "  <description>" + escaparHtmlAdmin(CONFIG.site.assinatura) + "</description>\n" +
    "  <language>pt-BR</language>\n" +
    itens +
    "\n</channel>\n</rss>\n"
  );
}
