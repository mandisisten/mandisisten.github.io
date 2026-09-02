/* Toda a comunicação com o GitHub. Publicar sempre grava um conjunto de
   arquivos em um único commit, via Git Data API — nunca uma chamada por
   arquivo, porque isso dispara vários builds e esbarra no limite de 10
   builds por hora do GitHub Pages. */

var GITHUB_API = "https://api.github.com";

function githubToken() {
  return localStorage.getItem("sm_token") || "";
}

function githubSalvarToken(token) {
  localStorage.setItem("sm_token", token);
}

function githubApagarToken() {
  localStorage.removeItem("sm_token");
}

async function githubFetch(caminho, opcoes) {
  opcoes = opcoes || {};
  var headers = Object.assign(
    {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + githubToken(),
    },
    opcoes.headers || {}
  );
  var resp = await fetch(GITHUB_API + caminho, Object.assign({}, opcoes, { headers: headers }));
  if (!resp.ok) {
    var corpo = "";
    try {
      corpo = (await resp.json()).message || "";
    } catch (e) {}
    var erro = new Error(
      "GitHub respondeu " + resp.status + (corpo ? ": " + corpo : "")
    );
    erro.status = resp.status;
    throw erro;
  }
  if (resp.status === 204) return null;
  return resp.json();
}

function repoBase() {
  return "/repos/" + CONFIG.repo.owner + "/" + CONFIG.repo.name;
}

async function githubTestarAcesso() {
  return githubFetch(repoBase());
}

/* Lê um arquivo existente via Contents API. Retorna null se não existir.
   Usado pelo painel para carregar os dados/*.json ao abrir cada aba. */
async function githubLerArquivo(caminho) {
  try {
    var dados = await githubFetch(
      repoBase() + "/contents/" + caminho + "?ref=" + CONFIG.repo.branch
    );
    var conteudo = decodeBase64Utf8(dados.content.replace(/\n/g, ""));
    return { conteudo: conteudo, sha: dados.sha };
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

async function githubLerJson(caminho, valorPadrao) {
  var arquivo = await githubLerArquivo(caminho);
  if (!arquivo) return valorPadrao;
  try {
    return JSON.parse(arquivo.conteudo);
  } catch (e) {
    throw new Error("O arquivo " + caminho + " no repositório não é um JSON válido.");
  }
}

function decodeBase64Utf8(base64) {
  var binario = atob(base64);
  var bytes = new Uint8Array(binario.length);
  for (var i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

function encodeUtf8Base64(texto) {
  var bytes = new TextEncoder().encode(texto);
  var binario = "";
  for (var i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
  return btoa(binario);
}

/**
 * Publica um conjunto de arquivos em um único commit.
 * arquivos: [{ caminho, conteudo, base64 }] — passe `conteudo` (string utf-8,
 * ex.: HTML/JSON) ou `base64` (ex.: imagem já comprimida), nunca os dois.
 */
async function githubPublicarArquivos(arquivos, mensagem) {
  var tentativas = 0;
  while (true) {
    tentativas++;
    try {
      return await githubPublicarArquivosUmaVez(arquivos, mensagem);
    } catch (e) {
      if (e.status === 409 && tentativas < 3) continue;
      throw e;
    }
  }
}

async function githubPublicarArquivosUmaVez(arquivos, mensagem) {
  var ref = await githubFetch(repoBase() + "/git/ref/heads/" + CONFIG.repo.branch);
  var commitAtualSha = ref.object.sha;
  var commitAtual = await githubFetch(repoBase() + "/git/commits/" + commitAtualSha);
  var treeBaseSha = commitAtual.tree.sha;

  var blobs = await Promise.all(
    arquivos.map(async function (arq) {
      var body = arq.base64
        ? { content: arq.base64, encoding: "base64" }
        : { content: arq.conteudo, encoding: "utf-8" };
      var blob = await githubFetch(repoBase() + "/git/blobs", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return { path: arq.caminho, mode: "100644", type: "blob", sha: blob.sha };
    })
  );

  var novaTree = await githubFetch(repoBase() + "/git/trees", {
    method: "POST",
    body: JSON.stringify({ base_tree: treeBaseSha, tree: blobs }),
  });

  var novoCommit = await githubFetch(repoBase() + "/git/commits", {
    method: "POST",
    body: JSON.stringify({
      message: mensagem,
      tree: novaTree.sha,
      parents: [commitAtualSha],
    }),
  });

  await githubFetch(repoBase() + "/git/refs/heads/" + CONFIG.repo.branch, {
    method: "PATCH",
    body: JSON.stringify({ sha: novoCommit.sha }),
  });

  return novoCommit;
}
