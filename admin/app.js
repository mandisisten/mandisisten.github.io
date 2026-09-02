/* Lógica do painel: login, abas, listas, editores e publicação.
   Tudo roda no navegador do administrador — não existe backend. */

var ESTADO = {
  abaAtiva: "materias",
  dados: null,
  editando: null,
  carregando: false,
};

/* ---------- utilidades locais ---------- */

function dataIsoComOffsetLocal(data) {
  data = data || new Date();
  function pad(n) { return String(Math.abs(n)).padStart(2, "0"); }
  var offsetMin = -data.getTimezoneOffset();
  var sinal = offsetMin >= 0 ? "+" : "-";
  var offH = pad(Math.floor(Math.abs(offsetMin) / 60));
  var offM = pad(Math.abs(offsetMin) % 60);
  return (
    data.getFullYear() + "-" + pad(data.getMonth() + 1) + "-" + pad(data.getDate()) +
    "T" + pad(data.getHours()) + ":" + pad(data.getMinutes()) + ":" + pad(data.getSeconds()) +
    sinal + offH + ":" + offM
  );
}

function gerarId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function el(id) { return document.getElementById(id); }

function mostrarMensagem(container, tipo, texto) {
  container.innerHTML = '<div class="mensagem ' + tipo + '">' + texto + "</div>" + container.innerHTML;
}

/* ---------- login / conexão com o repositório ---------- */

function repoConfigurado() {
  return !!(CONFIG.repo.owner && CONFIG.repo.name && githubToken());
}

function carregarRepoSalvo() {
  try {
    var salvo = JSON.parse(localStorage.getItem("sm_repo") || "null");
    if (salvo) Object.assign(CONFIG.repo, salvo);
  } catch (e) {}
}

function salvarRepoConfig(owner, name, branch) {
  CONFIG.repo.owner = owner;
  CONFIG.repo.name = name;
  CONFIG.repo.branch = branch || "main";
  localStorage.setItem("sm_repo", JSON.stringify(CONFIG.repo));
}

async function iniciar() {
  carregarRepoSalvo();
  el("campo-owner").value = CONFIG.repo.owner || "";
  el("campo-repo").value = CONFIG.repo.name || "";
  el("campo-branch").value = CONFIG.repo.branch || "main";
  el("campo-token").value = githubToken() || "";

  if (repoConfigurado()) {
    await tentarEntrar();
  }
}

async function tentarEntrar() {
  var erroEl = el("login-erro");
  erroEl.innerHTML = "";
  el("btn-entrar").disabled = true;
  el("btn-entrar").textContent = "Verificando…";
  try {
    await githubTestarAcesso();
    el("tela-login").classList.add("oculto");
    el("app").classList.remove("oculto");
    await carregarDados();
    trocarAba("materias");
  } catch (e) {
    erroEl.innerHTML = '<div class="mensagem erro">Não foi possível acessar o repositório. Confira o token e os dados do repositório. (' + escaparHtmlAdmin(e.message) + ")</div>";
  } finally {
    el("btn-entrar").disabled = false;
    el("btn-entrar").textContent = "Entrar";
  }
}

function ligarFormLogin() {
  el("form-login").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    githubSalvarToken(el("campo-token").value.trim());
    salvarRepoConfig(el("campo-owner").value.trim(), el("campo-repo").value.trim(), el("campo-branch").value.trim() || "main");
    await tentarEntrar();
  });
}

function sair() {
  if (!confirm("Isso apaga o token salvo neste aparelho. Você vai precisar colá-lo de novo da próxima vez. Continuar?")) return;
  githubApagarToken();
  location.reload();
}

/* ---------- carregar dados ---------- */

async function carregarDados() {
  ESTADO.carregando = true;
  var [index, vagas, obituarios, agenda, anunciantes, config] = await Promise.all([
    githubLerJson("dados/index.json", []),
    githubLerJson("dados/vagas.json", []),
    githubLerJson("dados/obituarios.json", []),
    githubLerJson("dados/agenda.json", []),
    githubLerJson("dados/anunciantes.json", []),
    githubLerJson("dados/config.json", { responsavel: "", cnpj: "", endereco: "", sobre: { titulo: "", corpo: "" }, faleConosco: { titulo: "", corpo: "" }, anuncie: { titulo: "", corpo: "" }, privacidade: { corpo: "" }, expediente: { corpo: "" } }),
  ]);
  ESTADO.dados = { index: index, vagas: vagas, obituarios: obituarios, agenda: agenda, anunciantes: anunciantes, config: config };
  ESTADO.carregando = false;
}

function reordenarIndice() {
  ESTADO.dados.index.sort(function (a, b) { return new Date(b.publicadoEm) - new Date(a.publicadoEm); });
}

/* ---------- abas ---------- */

function trocarAba(nome) {
  ESTADO.abaAtiva = nome;
  ESTADO.editando = null;
  document.querySelectorAll("nav.abas button").forEach(function (b) {
    b.classList.toggle("ativa", b.getAttribute("data-aba") === nome);
  });
  renderConteudo();
}

function renderConteudo() {
  var c = el("conteudo");
  c.innerHTML = "";
  if (ESTADO.editando) {
    if (ESTADO.editando.tipo === "materia") renderEditorMateria(c);
    else renderEditorModulo(c, ESTADO.editando.modulo, ESTADO.editando.item);
    return;
  }
  if (ESTADO.abaAtiva === "materias") renderListaMaterias(c);
  else if (ESTADO.abaAtiva === "config") renderConfig(c);
  else renderListaModulo(c, ESTADO.abaAtiva);
}

/* ================= MATÉRIAS ================= */

function renderListaMaterias(c) {
  var itens = ESTADO.dados.index;
  var linhas = itens
    .map(function (m) {
      return (
        "<li>" +
        "<div><span class=\"lista-item-titulo\">" + escaparHtmlAdmin(m.titulo) + "</span><br>" +
        '<span class="lista-item-meta">' + escaparHtmlAdmin(cidadeInfo(m.cidade).nome) + " · " + formatarDataLegivel(m.publicadoEm) +
        (m.destaque ? ' <span class="badge destaque">destaque</span>' : "") +
        (m.urgente ? ' <span class="badge urgente">urgente</span>' : "") +
        "</span></div>" +
        '<div class="lista-item-acoes"><button class="botao secundario" data-editar="' + escaparHtmlAdmin(m.slug) + '">Editar</button></div>' +
        "</li>"
      );
    })
    .join("");

  c.innerHTML =
    '<div class="cartao">' +
    '<button class="botao largo" id="btn-nova-materia">+ Nova matéria</button>' +
    "</div>" +
    (itens.length
      ? '<div class="cartao"><ul class="lista-itens">' + linhas + "</ul></div>"
      : '<div class="cartao"><p class="ajuda">Nenhuma matéria publicada ainda. Toque em "Nova matéria" para escrever a primeira.</p></div>');

  el("btn-nova-materia").addEventListener("click", function () { abrirEditorMateria(null); });
  c.querySelectorAll("[data-editar]").forEach(function (b) {
    b.addEventListener("click", function () { abrirEditorMateria(b.getAttribute("data-editar")); });
  });
}

async function abrirEditorMateria(slug) {
  var item = null;
  if (slug) {
    var c = el("conteudo");
    c.innerHTML = '<div class="cartao">Carregando matéria…</div>';
    item = await githubLerJson("dados/noticias/" + slug + ".json", null);
    if (!item) {
      c.innerHTML = '<div class="mensagem erro">Não encontrei essa matéria no repositório.</div>';
      return;
    }
  }
  ESTADO.editando = { tipo: "materia", item: item, imagemPendente: null };
  renderConteudo();
}

function opcoesCidade(selecionada) {
  return CONFIG.cidades
    .map(function (c) { return '<option value="' + c.slug + '"' + (c.slug === selecionada ? " selected" : "") + ">" + escaparHtmlAdmin(c.nome) + "</option>"; })
    .join("");
}

function opcoesEditoria(selecionada) {
  return CONFIG.editorias
    .map(function (e) { return '<option value="' + escaparHtmlAdmin(e) + '"' + (e === selecionada ? " selected" : "") + ">" + escaparHtmlAdmin(e) + "</option>"; })
    .join("");
}

function renderEditorMateria(c) {
  var m = ESTADO.editando.item || {};
  var ehNova = !m.slug;

  var rascunho = lerRascunho();
  var avisoRascunho = "";
  if (rascunho && rascunho.dados && rascunho.dados._contexto === (m.slug || "nova")) {
    avisoRascunho =
      '<div class="mensagem aviso rascunho-aviso"><span>Existe um rascunho salvo de ' +
      new Date(rascunho.salvoEm).toLocaleString("pt-BR") +
      ".</span><button class=\"botao secundario\" id=\"btn-recuperar-rascunho\">Recuperar</button></div>";
  }

  c.innerHTML =
    avisoRascunho +
    '<div class="cartao">' +
    '<button class="botao secundario" id="btn-voltar-lista" style="margin-bottom:12px;">← Voltar para a lista</button>' +
    '<label class="primeira">Título</label>' +
    '<input type="text" id="f-titulo" value="' + escaparHtmlAdmin(m.titulo || "") + '">' +
    (ehNova
      ? '<p class="slug-preview">Endereço: <code id="slug-preview">/n/…/</code></p>'
      : '<p class="slug-preview">Endereço fixo (não muda mesmo se o título mudar): <code>/n/' + escaparHtmlAdmin(m.slug) + '/</code></p>') +

    "<label>Resumo (aparece na lista e no compartilhamento)</label>" +
    '<textarea id="f-resumo" style="min-height:70px;">' + escaparHtmlAdmin(m.resumo || "") + "</textarea>" +

    "<label>Cidade</label>" +
    '<select id="f-cidade">' + opcoesCidade(m.cidade) + "</select>" +

    "<label>Editoria</label>" +
    '<select id="f-editoria">' + opcoesEditoria(m.editoria) + "</select>" +

    "<label>Autor</label>" +
    '<input type="text" id="f-autor" value="' + escaparHtmlAdmin(m.autor || "") + '">' +

    "<label>Link do vídeo (YouTube, opcional)</label>" +
    '<input type="url" id="f-video" placeholder="https://youtu.be/..." value="' + escaparHtmlAdmin(m.video || "") + '">' +
    '<p class="ajuda">Se preenchido, o vídeo aparece no lugar da imagem na matéria e entra no bloco "Vídeos" da home.</p>' +

    "<label>Imagem principal</label>" +
    '<input type="file" id="f-imagem" accept="image/*">' +
    '<div id="imagem-preview-wrap">' +
    (m.imagem ? '<p class="imagem-info">Imagem atual: ' + escaparHtmlAdmin(m.imagem) + "</p>" : "") +
    "</div>" +
    '<label style="margin-top:10px;">Texto alternativo da imagem (obrigatório se houver imagem)</label>' +
    '<input type="text" id="f-imagem-alt" value="' + escaparHtmlAdmin(m.imagemAlt || "") + '">' +
    "<label>Crédito da imagem (opcional)</label>" +
    '<input type="text" id="f-imagem-credito" value="' + escaparHtmlAdmin(m.imagemCredito || "") + '">' +

    '<div class="linha-checkbox"><input type="checkbox" id="f-destaque"' + (m.destaque ? " checked" : "") + '><label for="f-destaque">Destaque (vira manchete da home)</label></div>' +
    '<div class="linha-checkbox"><input type="checkbox" id="f-urgente"' + (m.urgente ? " checked" : "") + '><label for="f-urgente">Urgente (tarja vermelha no topo)</label></div>' +

    "<label>Corpo da matéria</label>" +
    '<div class="barra-ferramentas">' +
    '<button data-acao="negrito" type="button"><strong>B</strong></button>' +
    '<button data-acao="italico" type="button"><em>I</em></button>' +
    '<button data-acao="link" type="button">Link</button>' +
    '<button data-acao="intertitulo" type="button">Intertítulo</button>' +
    '<button data-acao="citacao" type="button">Citação</button>' +
    '<button data-acao="lista" type="button">Lista</button>' +
    "</div>" +
    '<textarea id="f-corpo" style="min-height:260px;">' + escaparHtmlAdmin(m.conteudo || "") + "</textarea>" +
    '<p class="ajuda">Separe parágrafos com uma linha em branco. Use os botões acima para negrito, itálico, links, intertítulos, citações e listas.</p>' +

    '<button class="botao secundario largo" id="btn-previsualizar" style="margin-top:14px;">Pré-visualizar</button>' +
    '<div id="previsualizacao-wrap"></div>' +
    "</div>" +
    '<div class="barra-publicar">' +
    '<button class="botao secundario" id="btn-cancelar">Cancelar</button>' +
    '<button class="botao largo" id="btn-publicar-materia">' + (ehNova ? "Publicar" : "Salvar alterações") + "</button>" +
    "</div>";

  ligarBarraFerramentas(c.querySelector(".barra-ferramentas"), el("f-corpo"));

  el("btn-voltar-lista").addEventListener("click", function () { ESTADO.editando = null; renderConteudo(); });
  el("btn-cancelar").addEventListener("click", function () { ESTADO.editando = null; renderConteudo(); });

  if (ehNova) {
    el("f-titulo").addEventListener("input", function () {
      el("slug-preview").textContent = "/n/" + slugify(el("f-titulo").value) + "/";
    });
  }

  el("f-imagem").addEventListener("change", async function (ev) {
    var file = ev.target.files[0];
    if (!file) return;
    var wrap = el("imagem-preview-wrap");
    wrap.innerHTML = "<p class=\"imagem-info\">Comprimindo imagem…</p>";
    try {
      var resultado = await comprimirImagem(file);
      var agora = new Date();
      var caminho =
        "/img/" + agora.getFullYear() + "/" + String(agora.getMonth() + 1).padStart(2, "0") + "/" +
        (slugify(el("f-titulo").value) || "materia") + "-" + Date.now().toString(36) + ".jpg";
      ESTADO.editando.imagemPendente = { base64: resultado.base64, caminho: caminho, sizeBytes: resultado.sizeBytes };
      wrap.innerHTML =
        '<img class="imagem-preview" src="data:image/jpeg;base64,' + resultado.base64 + '">' +
        '<p class="imagem-info">' + Math.round(resultado.sizeBytes / 1024) + " KB depois de comprimida · será salva em " + caminho + "</p>";
    } catch (e) {
      wrap.innerHTML = '<div class="mensagem erro">' + escaparHtmlAdmin(e.message) + "</div>";
      ev.target.value = "";
    }
  });

  if (rascunho && rascunho.dados && rascunho.dados._contexto === (m.slug || "nova")) {
    el("btn-recuperar-rascunho").addEventListener("click", function () {
      aplicarRascunhoNoForm(rascunho.dados);
    });
  }

  el("btn-previsualizar").addEventListener("click", function () { previsualizarMateria(); });
  el("btn-publicar-materia").addEventListener("click", function () { publicarMateria(); });

  ESTADO.autosaveTimer && clearInterval(ESTADO.autosaveTimer);
  ESTADO.autosaveTimer = iniciarAutosave(function () {
    var dados = coletarFormMateria();
    dados._contexto = m.slug || "nova";
    return dados;
  });
}

function aplicarRascunhoNoForm(dados) {
  el("f-titulo").value = dados.titulo || "";
  el("f-resumo").value = dados.resumo || "";
  el("f-cidade").value = dados.cidade || "";
  el("f-editoria").value = dados.editoria || "";
  el("f-autor").value = dados.autor || "";
  el("f-imagem-alt").value = dados.imagemAlt || "";
  el("f-imagem-credito").value = dados.imagemCredito || "";
  el("f-video").value = dados.video || "";
  el("f-destaque").checked = !!dados.destaque;
  el("f-urgente").checked = !!dados.urgente;
  el("f-corpo").value = dados.corpoBruto || "";
}

function coletarFormMateria() {
  return {
    titulo: el("f-titulo").value.trim(),
    resumo: el("f-resumo").value.trim(),
    cidade: el("f-cidade").value,
    editoria: el("f-editoria").value,
    autor: el("f-autor").value.trim(),
    imagemAlt: el("f-imagem-alt").value.trim(),
    imagemCredito: el("f-imagem-credito").value.trim(),
    video: el("f-video").value.trim(),
    destaque: el("f-destaque").checked,
    urgente: el("f-urgente").checked,
    corpoBruto: el("f-corpo").value,
  };
}

function montarMateriaAPartirDoForm() {
  var form = coletarFormMateria();
  var original = ESTADO.editando.item;
  var slug = original ? original.slug : slugUnico(form.titulo, ESTADO.dados.index.map(function (i) { return i.slug; }));
  var pendente = ESTADO.editando.imagemPendente;
  var imagem = pendente ? pendente.caminho : (original ? original.imagem : null);

  return {
    slug: slug,
    titulo: form.titulo,
    resumo: form.resumo,
    conteudo: prepararCorpoHtml(form.corpoBruto),
    cidade: form.cidade,
    editoria: form.editoria,
    imagem: imagem,
    imagemAlt: form.imagemAlt,
    imagemCredito: form.imagemCredito,
    video: form.video || null,
    autor: form.autor,
    urgente: form.urgente,
    destaque: form.destaque,
    publicadoEm: original ? original.publicadoEm : dataIsoComOffsetLocal(),
    atualizadoEm: original ? dataIsoComOffsetLocal() : null,
  };
}

function validarMateria(m) {
  var erros = [];
  if (!m.titulo) erros.push("O título é obrigatório.");
  if (!m.resumo) erros.push("O resumo é obrigatório.");
  if (!m.cidade) erros.push("Escolha uma cidade.");
  if (!m.editoria) erros.push("Escolha uma editoria.");
  if (!m.conteudo || m.conteudo.length < 10) erros.push("Escreva o corpo da matéria.");
  if (m.imagem && !m.imagemAlt) erros.push("Toda imagem precisa de texto alternativo antes de publicar.");
  if (m.video && !extrairYoutubeId(m.video)) erros.push("O link do vídeo não parece ser um link válido do YouTube.");
  return erros;
}

function injetarCssInline(html, css) {
  return html.replace('<link rel="stylesheet" href="/assets/site.css">', "<style>" + css + "</style>");
}

var CSS_CACHE = null;
async function obterCssParaPreview() {
  if (CSS_CACHE) return CSS_CACHE;
  var arq = await githubLerArquivo("assets/site.css").catch(function () { return null; });
  CSS_CACHE = arq ? arq.conteudo : "";
  return CSS_CACHE;
}

async function previsualizarMateria() {
  var m = montarMateriaAPartirDoForm();
  var wrap = el("previsualizacao-wrap");
  wrap.innerHTML = '<div class="cartao">Montando pré-visualização…</div>';
  var css = await obterCssParaPreview();
  var html = injetarCssInline(renderPaginaMateria(m, []), css);
  wrap.innerHTML = '<div class="previsualizacao"><iframe title="Pré-visualização" srcdoc="' + escaparHtmlAdmin(html) + '"></iframe></div>';
}

async function publicarMateria() {
  var m = montarMateriaAPartirDoForm();
  var erros = validarMateria(m);
  var c = el("conteudo");
  if (erros.length) {
    mostrarMensagem(c, "erro", erros.join("<br>"));
    return;
  }

  var botao = el("btn-publicar-materia");
  botao.disabled = true;
  var ehNova = !ESTADO.editando.item;
  botao.textContent = "Publicando…";

  try {
    var indiceAtualizado = ESTADO.dados.index.filter(function (i) { return i.slug !== m.slug; });
    indiceAtualizado.push({
      slug: m.slug, titulo: m.titulo, resumo: m.resumo, cidade: m.cidade, editoria: m.editoria,
      imagem: m.imagem, video: m.video, autor: m.autor, publicadoEm: m.publicadoEm, destaque: m.destaque, urgente: m.urgente,
    });
    indiceAtualizado.sort(function (a, b) { return new Date(b.publicadoEm) - new Date(a.publicadoEm); });

    var pendente = ESTADO.editando.imagemPendente;
    var arquivos = arquivosParaPublicarMateria(m, indiceAtualizado, pendente ? pendente.base64 : null, ESTADO.dados.vagas, ESTADO.dados.agenda);
    var mensagem = (ehNova ? "publica: " : "atualiza: ") + m.titulo;
    await githubPublicarArquivos(arquivos, mensagem);

    ESTADO.dados.index = indiceAtualizado;
    apagarRascunho();
    ESTADO.editando = null;
    trocarAba("materias");
    mostrarMensagem(
      el("conteudo"), "sucesso",
      (ehNova ? "Publicada." : "Atualizada.") +
      ' O site leva de 20 a 60 segundos para atualizar. <a href="' + urlAbsoluta(urlMateria(m.slug)) + '" target="_blank" rel="noopener">Ver matéria no ar</a>.'
    );
  } catch (e) {
    mostrarMensagem(c, "erro", "Não consegui publicar: " + escaparHtmlAdmin(e.message) + ". Nada foi perdido — tente de novo.");
  } finally {
    botao.disabled = false;
    botao.textContent = ehNova ? "Publicar" : "Salvar alterações";
  }
}

/* ================= MÓDULOS (vagas, obituários, agenda, anunciantes) ================= */

var MODULOS = {
  vagas: {
    tituloAba: "Vagas", singular: "Vaga",
    chaveDados: "vagas",
    caminhoHtml: "vagas/index.html",
    gerarHtml: function (d) { return renderPaginaVagas(d.vagas); },
    campos: [
      { chave: "titulo", rotulo: "Título da vaga", tipo: "texto", obrigatorio: true },
      { chave: "empresa", rotulo: "Empresa", tipo: "texto" },
      { chave: "cidade", rotulo: "Cidade", tipo: "cidade", obrigatorio: true },
      { chave: "descricao", rotulo: "Descrição", tipo: "textarea" },
      { chave: "contato", rotulo: "Contato", tipo: "texto" },
      { chave: "expiraEm", rotulo: "Expira em", tipo: "data" },
    ],
    itemTitulo: function (i) { return i.titulo; },
    itemMeta: function (i) { return cidadeInfo(i.cidade).nome; },
  },
  obituarios: {
    tituloAba: "Obituários", singular: "Registro",
    chaveDados: "obituarios",
    caminhoHtml: "obituario/index.html",
    gerarHtml: function (d) { return renderPaginaObituario(d.obituarios); },
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true },
      { chave: "cidade", rotulo: "Cidade", tipo: "cidade", obrigatorio: true },
      { chave: "texto", rotulo: "Texto", tipo: "textarea" },
    ],
    itemTitulo: function (i) { return i.nome; },
    itemMeta: function (i) { return cidadeInfo(i.cidade).nome; },
  },
  agenda: {
    tituloAba: "Agenda", singular: "Evento",
    chaveDados: "agenda",
    caminhoHtml: "agenda/index.html",
    gerarHtml: function (d) { return renderPaginaAgenda(d.agenda); },
    campos: [
      { chave: "titulo", rotulo: "Título do evento", tipo: "texto", obrigatorio: true },
      { chave: "cidade", rotulo: "Cidade", tipo: "cidade", obrigatorio: true },
      { chave: "local", rotulo: "Local", tipo: "texto" },
      { chave: "data", rotulo: "Data", tipo: "data", obrigatorio: true },
      { chave: "descricao", rotulo: "Descrição", tipo: "textarea" },
    ],
    itemTitulo: function (i) { return i.titulo; },
    itemMeta: function (i) { return cidadeInfo(i.cidade).nome + " · " + formatarDataLegivel(i.data); },
  },
  anunciantes: {
    tituloAba: "Anunciantes", singular: "Anunciante",
    chaveDados: "anunciantes",
    caminhoHtml: "guia/index.html",
    gerarHtml: function (d) { return renderPaginaGuia(d.anunciantes); },
    campos: [
      { chave: "nome", rotulo: "Nome do negócio", tipo: "texto", obrigatorio: true },
      { chave: "categoria", rotulo: "Categoria", tipo: "texto" },
      { chave: "cidade", rotulo: "Cidade", tipo: "cidade", obrigatorio: true },
      { chave: "whatsapp", rotulo: "WhatsApp (só números, com DDD)", tipo: "texto" },
      { chave: "ativo", rotulo: "Anúncio ativo", tipo: "checkbox" },
    ],
    itemTitulo: function (i) { return i.nome; },
    itemMeta: function (i) { return cidadeInfo(i.cidade).nome + (i.ativo === false ? " · inativo" : ""); },
  },
};

function renderListaModulo(c, chave) {
  var mod = MODULOS[chave];
  var itens = ESTADO.dados[mod.chaveDados];
  var linhas = itens
    .map(function (item) {
      return (
        "<li><div><span class=\"lista-item-titulo\">" + escaparHtmlAdmin(mod.itemTitulo(item)) + "</span><br>" +
        '<span class="lista-item-meta">' + escaparHtmlAdmin(mod.itemMeta(item)) + "</span></div>" +
        '<div class="lista-item-acoes"><button class="botao secundario" data-editar="' + item.id + '">Editar</button>' +
        '<button class="botao secundario" data-excluir="' + item.id + '">Excluir</button></div></li>'
      );
    })
    .join("");

  c.innerHTML =
    '<div class="cartao"><button class="botao largo" id="btn-novo-item">+ Novo(a) ' + mod.singular.toLowerCase() + "</button></div>" +
    (itens.length
      ? '<div class="cartao"><ul class="lista-itens">' + linhas + "</ul></div>"
      : '<div class="cartao"><p class="ajuda">Nada cadastrado ainda.</p></div>');

  el("btn-novo-item").addEventListener("click", function () {
    ESTADO.editando = { tipo: "modulo", modulo: chave, item: null };
    renderConteudo();
  });
  c.querySelectorAll("[data-editar]").forEach(function (b) {
    b.addEventListener("click", function () {
      var item = itens.find(function (i) { return i.id === b.getAttribute("data-editar"); });
      ESTADO.editando = { tipo: "modulo", modulo: chave, item: item };
      renderConteudo();
    });
  });
  c.querySelectorAll("[data-excluir]").forEach(function (b) {
    b.addEventListener("click", function () { excluirItemModulo(chave, b.getAttribute("data-excluir")); });
  });
}

function campoHtmlModulo(campo, valor) {
  var id = "f-" + campo.chave;
  if (campo.tipo === "textarea") {
    return "<label>" + campo.rotulo + "</label><textarea id=\"" + id + "\">" + escaparHtmlAdmin(valor || "") + "</textarea>";
  }
  if (campo.tipo === "cidade") {
    return "<label>" + campo.rotulo + "</label><select id=\"" + id + "\">" + opcoesCidade(valor) + "</select>";
  }
  if (campo.tipo === "data") {
    return "<label>" + campo.rotulo + "</label><input type=\"date\" id=\"" + id + "\" value=\"" + escaparHtmlAdmin(valor || "") + "\">";
  }
  if (campo.tipo === "checkbox") {
    return '<div class="linha-checkbox"><input type="checkbox" id="' + id + '"' + (valor !== false ? " checked" : "") + "><label for=\"" + id + "\">" + campo.rotulo + "</label></div>";
  }
  return "<label>" + campo.rotulo + "</label><input type=\"text\" id=\"" + id + "\" value=\"" + escaparHtmlAdmin(valor || "") + "\">";
}

function renderEditorModulo(c, chave, item) {
  var mod = MODULOS[chave];
  var camposHtml = mod.campos.map(function (campo) { return campoHtmlModulo(campo, item ? item[campo.chave] : (campo.tipo === "checkbox" ? true : "")); }).join("");

  c.innerHTML =
    '<div class="cartao">' +
    '<button class="botao secundario" id="btn-voltar-lista" style="margin-bottom:12px;">← Voltar para a lista</button>' +
    camposHtml +
    "</div>" +
    '<div class="barra-publicar">' +
    '<button class="botao secundario" id="btn-cancelar">Cancelar</button>' +
    '<button class="botao largo" id="btn-salvar-item">Publicar</button>' +
    "</div>";

  el("btn-voltar-lista").addEventListener("click", function () { ESTADO.editando = null; renderConteudo(); });
  el("btn-cancelar").addEventListener("click", function () { ESTADO.editando = null; renderConteudo(); });
  el("btn-salvar-item").addEventListener("click", function () { salvarItemModulo(chave, item); });
}

async function salvarItemModulo(chave, itemOriginal) {
  var mod = MODULOS[chave];
  var novo = itemOriginal ? Object.assign({}, itemOriginal) : { id: gerarId(), publicadoEm: dataIsoComOffsetLocal() };
  var erros = [];

  mod.campos.forEach(function (campo) {
    var campoEl = el("f-" + campo.chave);
    var valor;
    if (campo.tipo === "checkbox") valor = campoEl.checked;
    else valor = campoEl.value.trim();
    if (campo.obrigatorio && !valor) erros.push(campo.rotulo + " é obrigatório.");
    if (campo.tipo === "textarea" && valor) valor = prepararCorpoHtml(valor);
    novo[campo.chave] = valor;
  });

  var c = el("conteudo");
  if (erros.length) {
    mostrarMensagem(c, "erro", erros.join("<br>"));
    return;
  }

  var botao = el("btn-salvar-item");
  botao.disabled = true;
  botao.textContent = "Publicando…";
  try {
    var lista = ESTADO.dados[mod.chaveDados].filter(function (i) { return i.id !== novo.id; });
    lista.push(novo);
    ESTADO.dados[mod.chaveDados] = lista;

    var arquivos = [
      { caminho: "dados/" + mod.chaveDados + ".json", conteudo: JSON.stringify(lista, null, 2) },
      { caminho: mod.caminhoHtml, conteudo: mod.gerarHtml(ESTADO.dados) },
    ];
    if (chave === "vagas" || chave === "agenda") {
      arquivos.push({ caminho: "index.html", conteudo: renderPaginaHome(ESTADO.dados.index, ESTADO.dados.vagas, ESTADO.dados.agenda) });
    }
    await githubPublicarArquivos(arquivos, (itemOriginal ? "atualiza: " : "publica: ") + mod.singular.toLowerCase());

    ESTADO.editando = null;
    trocarAba(chave);
    mostrarMensagem(el("conteudo"), "sucesso", "Publicado. O site leva de 20 a 60 segundos para atualizar.");
  } catch (e) {
    mostrarMensagem(c, "erro", "Não consegui publicar: " + escaparHtmlAdmin(e.message));
  } finally {
    botao.disabled = false;
    botao.textContent = "Publicar";
  }
}

async function excluirItemModulo(chave, id) {
  if (!confirm("Excluir este item? Isso publica a lista sem ele.")) return;
  var mod = MODULOS[chave];
  var lista = ESTADO.dados[mod.chaveDados].filter(function (i) { return i.id !== id; });
  ESTADO.dados[mod.chaveDados] = lista;
  var arquivos = [
    { caminho: "dados/" + mod.chaveDados + ".json", conteudo: JSON.stringify(lista, null, 2) },
    { caminho: mod.caminhoHtml, conteudo: mod.gerarHtml(ESTADO.dados) },
  ];
  if (chave === "vagas" || chave === "agenda") {
    arquivos.push({ caminho: "index.html", conteudo: renderPaginaHome(ESTADO.dados.index, ESTADO.dados.vagas, ESTADO.dados.agenda) });
  }
  try {
    await githubPublicarArquivos(arquivos, "remove: " + mod.singular.toLowerCase());
    trocarAba(chave);
  } catch (e) {
    alert("Não consegui excluir: " + e.message);
  }
}

/* ================= CONFIGURAÇÕES ================= */

function renderConfig(c) {
  var cfg = ESTADO.dados.config;
  c.innerHTML =
    '<div class="cartao"><h2>Repositório</h2>' +
    "<label class=\"primeira\">Usuário/organização do GitHub</label><input type=\"text\" id=\"cfg-owner\" value=\"" + escaparHtmlAdmin(CONFIG.repo.owner) + "\">" +
    "<label>Nome do repositório</label><input type=\"text\" id=\"cfg-repo\" value=\"" + escaparHtmlAdmin(CONFIG.repo.name) + "\">" +
    "<label>Branch</label><input type=\"text\" id=\"cfg-branch\" value=\"" + escaparHtmlAdmin(CONFIG.repo.branch) + "\">" +
    '<button class="botao secundario" id="btn-salvar-repo" style="margin-top:10px;">Salvar</button>' +
    '<button class="botao perigo" id="btn-sair" style="margin-top:10px;">Sair (apaga o token deste aparelho)</button>' +
    "</div>" +

    '<div class="cartao"><h2>Dados institucionais</h2>' +
    "<label class=\"primeira\">Responsável</label><input type=\"text\" id=\"cfg-responsavel\" value=\"" + escaparHtmlAdmin(cfg.responsavel) + "\">" +
    "<label>CNPJ</label><input type=\"text\" id=\"cfg-cnpj\" value=\"" + escaparHtmlAdmin(cfg.cnpj) + "\">" +
    "<label>Endereço</label><input type=\"text\" id=\"cfg-endereco\" value=\"" + escaparHtmlAdmin(cfg.endereco) + "\">" +
    "<label>Texto da página \"Sobre\"</label><textarea id=\"cfg-sobre\">" + escaparHtmlAdmin(cfg.sobre.corpo) + "</textarea>" +
    "<label>Texto da página \"Fale Conosco\"</label><textarea id=\"cfg-fale-conosco\">" + escaparHtmlAdmin(cfg.faleConosco.corpo) + "</textarea>" +
    "<label>Texto da página \"Anuncie\"</label><textarea id=\"cfg-anuncie\">" + escaparHtmlAdmin(cfg.anuncie.corpo) + "</textarea>" +
    "<label>Texto da página \"Privacidade\"</label><textarea id=\"cfg-privacidade\">" + escaparHtmlAdmin(cfg.privacidade.corpo) + "</textarea>" +
    "<label>Texto da página \"Expediente\"</label><textarea id=\"cfg-expediente\">" + escaparHtmlAdmin(cfg.expediente.corpo) + "</textarea>" +
    '<button class="botao largo" id="btn-salvar-config" style="margin-top:10px;">Publicar alterações</button>' +
    "</div>" +

    '<div class="cartao"><h2>Manutenção</h2>' +
    '<p class="ajuda">Reconstrói todas as páginas do site a partir dos dados atuais. Use depois de mudar um modelo de página, ou se algo parecer fora de sincronia.</p>' +
    '<button class="botao secundario largo" id="btn-regerar-tudo">Regerar site inteiro</button>' +
    '<div id="regerar-status"></div>' +
    "</div>";

  el("btn-sair").addEventListener("click", sair);
  el("btn-salvar-repo").addEventListener("click", function () {
    salvarRepoConfig(el("cfg-owner").value.trim(), el("cfg-repo").value.trim(), el("cfg-branch").value.trim() || "main");
    mostrarMensagem(c, "sucesso", "Dados do repositório salvos neste aparelho.");
  });
  el("btn-salvar-config").addEventListener("click", salvarConfig);
  el("btn-regerar-tudo").addEventListener("click", regerarSiteInteiro);
}

async function salvarConfig() {
  var c = el("conteudo");
  var cfg = ESTADO.dados.config;
  cfg.responsavel = el("cfg-responsavel").value.trim();
  cfg.cnpj = el("cfg-cnpj").value.trim();
  cfg.endereco = el("cfg-endereco").value.trim();
  cfg.sobre.corpo = prepararCorpoHtml(el("cfg-sobre").value);
  cfg.faleConosco.corpo = prepararCorpoHtml(el("cfg-fale-conosco").value);
  cfg.anuncie.corpo = prepararCorpoHtml(el("cfg-anuncie").value);
  cfg.privacidade.corpo = prepararCorpoHtml(el("cfg-privacidade").value);
  cfg.expediente.corpo = prepararCorpoHtml(el("cfg-expediente").value);

  var botao = el("btn-salvar-config");
  botao.disabled = true;
  botao.textContent = "Publicando…";
  try {
    var arquivos = [
      { caminho: "dados/config.json", conteudo: JSON.stringify(cfg, null, 2) },
      { caminho: "sobre/index.html", conteudo: renderPaginaInstitucional("/sobre/", cfg.sobre.titulo || "Sobre", cfg.sobre.corpo, "Sobre o " + CONFIG.site.nome) },
      { caminho: "fale-conosco/index.html", conteudo: renderPaginaInstitucional("/fale-conosco/", cfg.faleConosco.titulo || "Fale Conosco", cfg.faleConosco.corpo, "Fale com a redação do " + CONFIG.site.nome) },
      { caminho: "anuncie/index.html", conteudo: renderPaginaInstitucional("/anuncie/", cfg.anuncie.titulo || "Anuncie", cfg.anuncie.corpo, "Anuncie no " + CONFIG.site.nome) },
      { caminho: "privacidade/index.html", conteudo: renderPaginaInstitucional("/privacidade/", "Política de privacidade", cfg.privacidade.corpo, "Política de privacidade") },
      { caminho: "expediente/index.html", conteudo: renderPaginaInstitucional("/expediente/", "Expediente", montarCorpoExpediente(cfg), "Expediente") },
    ];
    await githubPublicarArquivos(arquivos, "atualiza: configurações institucionais");
    mostrarMensagem(c, "sucesso", "Publicado. O site leva de 20 a 60 segundos para atualizar.");
  } catch (e) {
    mostrarMensagem(c, "erro", "Não consegui publicar: " + escaparHtmlAdmin(e.message));
  } finally {
    botao.disabled = false;
    botao.textContent = "Publicar alterações";
  }
}

async function regerarSiteInteiro() {
  var status = el("regerar-status");
  var botao = el("btn-regerar-tudo");
  botao.disabled = true;
  status.innerHTML = '<div class="mensagem aviso">Buscando o conteúdo completo de todas as matérias…</div>';
  try {
    var materias = await buscarTodasMaterias(ESTADO.dados.index);
    status.innerHTML = '<div class="mensagem aviso">Gerando ' + (materias.length + 20) + " páginas…</div>";
    var arquivos = arquivosParaRegerarTudo({
      index: ESTADO.dados.index,
      materias: materias,
      vagas: ESTADO.dados.vagas,
      obituarios: ESTADO.dados.obituarios,
      agenda: ESTADO.dados.agenda,
      anunciantes: ESTADO.dados.anunciantes,
      config: ESTADO.dados.config,
    });
    status.innerHTML = '<div class="mensagem aviso">Publicando ' + arquivos.length + " arquivos em um único commit…</div>";
    await githubPublicarArquivos(arquivos, "regera: site inteiro");
    status.innerHTML = '<div class="mensagem sucesso">Pronto. ' + arquivos.length + " arquivos publicados. O site leva de 20 a 60 segundos para atualizar.</div>";
  } catch (e) {
    status.innerHTML = '<div class="mensagem erro">Não consegui regerar: ' + escaparHtmlAdmin(e.message) + "</div>";
  } finally {
    botao.disabled = false;
  }
}

/* ---------- boot ---------- */

document.addEventListener("DOMContentLoaded", function () {
  ligarFormLogin();
  document.querySelectorAll("nav.abas button").forEach(function (b) {
    b.addEventListener("click", function () { trocarAba(b.getAttribute("data-aba")); });
  });
  iniciar();
});
