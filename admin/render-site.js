/* Orquestra quais arquivos escrever no repositório: tanto para publicar uma
   matéria (conjunto pequeno) quanto para "Regerar site inteiro" (tudo). */

var ITENS_POR_PAGINA = 30;

function paginar(itens, porPagina) {
  porPagina = porPagina || ITENS_POR_PAGINA;
  var paginas = [];
  for (var i = 0; i < itens.length; i += porPagina) {
    paginas.push(itens.slice(i, i + porPagina));
  }
  if (!paginas.length) paginas.push([]);
  return paginas;
}

function itensDaCidade(index, slugCidade) {
  return index.filter(function (m) { return m.cidade === slugCidade; });
}

function itensDaEditoria(index, nomeEditoria) {
  return index.filter(function (m) { return m.editoria === nomeEditoria; });
}

function relacionadasDaCidade(index, materia) {
  return index
    .filter(function (m) { return m.cidade === materia.cidade && m.slug !== materia.slug; })
    .slice(0, 3);
}

/* Arquivos gravados ao publicar (ou atualizar) uma única matéria.
   `vagas`/`agenda` alimentam os widgets da barra lateral da home. */
function arquivosParaPublicarMateria(materia, index, imagemBase64, vagas, agenda) {
  var arquivos = [];

  arquivos.push({ caminho: "dados/noticias/" + materia.slug + ".json", conteudo: JSON.stringify(materia, null, 2) });
  arquivos.push({ caminho: "n/" + materia.slug + "/index.html", conteudo: renderPaginaMateria(materia, relacionadasDaCidade(index, materia)) });

  if (imagemBase64) {
    arquivos.push({ caminho: materia.imagem.replace(/^\//, ""), base64: imagemBase64 });
  }

  arquivos.push({ caminho: "dados/index.json", conteudo: JSON.stringify(index, null, 2) });
  arquivos.push({ caminho: "index.html", conteudo: renderPaginaHome(index, vagas, agenda) });

  var paginasCidade = paginar(itensDaCidade(index, materia.cidade));
  arquivos.push({
    caminho: materia.cidade + "/index.html",
    conteudo: renderPaginaCidade(materia.cidade, paginasCidade[0], 1, paginasCidade.length),
  });

  var slugEd = editoriaSlug(materia.editoria);
  var paginasEditoria = paginar(itensDaEditoria(index, materia.editoria));
  arquivos.push({
    caminho: "editoria/" + slugEd + "/index.html",
    conteudo: renderPaginaEditoria(materia.editoria, paginasEditoria[0], 1, paginasEditoria.length),
  });

  arquivos.push({ caminho: "sitemap.xml", conteudo: renderSitemapXml(index) });
  arquivos.push({ caminho: "feed.xml", conteudo: renderFeedXml(index) });

  return arquivos;
}

/* Regera o site inteiro a partir dos dados atuais — rede de segurança para
   quando um template muda. Precisa do conteúdo completo de cada matéria
   (para as páginas /n/*), não só do índice leve. */
function arquivosParaRegerarTudo(dados) {
  var index = dados.index;
  var materias = dados.materias;
  var arquivos = [];

  arquivos.push({ caminho: "index.html", conteudo: renderPaginaHome(index, dados.vagas, dados.agenda) });

  CONFIG.cidades.forEach(function (c) {
    var paginas = paginar(itensDaCidade(index, c.slug));
    paginas.forEach(function (itensPagina, i) {
      var caminho = i === 0 ? c.slug + "/index.html" : c.slug + "/" + (i + 1) + "/index.html";
      arquivos.push({ caminho: caminho, conteudo: renderPaginaCidade(c.slug, itensPagina, i + 1, paginas.length) });
    });
  });

  CONFIG.editorias.forEach(function (nomeEd) {
    var slugEd = editoriaSlug(nomeEd);
    var paginas = paginar(itensDaEditoria(index, nomeEd));
    paginas.forEach(function (itensPagina, i) {
      var caminho = i === 0 ? "editoria/" + slugEd + "/index.html" : "editoria/" + slugEd + "/" + (i + 1) + "/index.html";
      arquivos.push({ caminho: caminho, conteudo: renderPaginaEditoria(nomeEd, itensPagina, i + 1, paginas.length) });
    });
  });

  materias.forEach(function (m) {
    arquivos.push({ caminho: "n/" + m.slug + "/index.html", conteudo: renderPaginaMateria(m, relacionadasDaCidade(index, m)) });
  });

  arquivos.push({ caminho: "vagas/index.html", conteudo: renderPaginaVagas(dados.vagas) });
  arquivos.push({ caminho: "obituario/index.html", conteudo: renderPaginaObituario(dados.obituarios) });
  arquivos.push({ caminho: "agenda/index.html", conteudo: renderPaginaAgenda(dados.agenda) });
  arquivos.push({ caminho: "guia/index.html", conteudo: renderPaginaGuia(dados.anunciantes) });

  arquivos.push({ caminho: "sobre/index.html", conteudo: renderPaginaInstitucional("/sobre/", dados.config.sobre.titulo || "Sobre", dados.config.sobre.corpo, "Sobre o " + CONFIG.site.nome) });
  arquivos.push({ caminho: "fale-conosco/index.html", conteudo: renderPaginaInstitucional("/fale-conosco/", dados.config.faleConosco.titulo || "Fale Conosco", dados.config.faleConosco.corpo, "Fale com a redação do " + CONFIG.site.nome) });
  arquivos.push({ caminho: "anuncie/index.html", conteudo: renderPaginaInstitucional("/anuncie/", dados.config.anuncie.titulo || "Anuncie", dados.config.anuncie.corpo, "Anuncie no " + CONFIG.site.nome) });
  arquivos.push({ caminho: "privacidade/index.html", conteudo: renderPaginaInstitucional("/privacidade/", "Política de privacidade", dados.config.privacidade.corpo, "Política de privacidade") });
  arquivos.push({ caminho: "expediente/index.html", conteudo: renderPaginaInstitucional("/expediente/", "Expediente", montarCorpoExpediente(dados.config), "Expediente") });

  arquivos.push({ caminho: "404.html", conteudo: renderPagina404() });
  arquivos.push({ caminho: "sitemap.xml", conteudo: renderSitemapXml(index) });
  arquivos.push({ caminho: "feed.xml", conteudo: renderFeedXml(index) });

  return arquivos;
}

/* Busca todas as matérias completas do repositório (para regerar tudo). */
async function buscarTodasMaterias(index) {
  var resultados = await Promise.all(
    index.map(function (item) {
      return githubLerJson("dados/noticias/" + item.slug + ".json", null);
    })
  );
  return resultados.filter(Boolean);
}
