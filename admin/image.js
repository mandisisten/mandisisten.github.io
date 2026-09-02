/* Compressão de imagem no navegador via canvas, antes de gravar no
   repositório. Alvo: abaixo de 200 KB. Acima de 400 KB é bloqueado. */
var IMAGEM_LARGURA_MAX = 1280;
var IMAGEM_QUALIDADE_INICIAL = 0.72;
var IMAGEM_ALVO_BYTES = 200 * 1024;
var IMAGEM_LIMITE_BYTES = 400 * 1024;

function carregarImagemArquivo(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir essa imagem."));
    };
    img.src = url;
  });
}

function canvasParaBlob(canvas, qualidade) {
  return new Promise(function (resolve) {
    canvas.toBlob(resolve, "image/jpeg", qualidade);
  });
}

async function comprimirImagem(file) {
  var img = await carregarImagemArquivo(file);
  var escala = Math.min(1, IMAGEM_LARGURA_MAX / img.width);
  var largura = Math.round(img.width * escala);
  var altura = Math.round(img.height * escala);

  var canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, largura, altura);

  var qualidade = IMAGEM_QUALIDADE_INICIAL;
  var blob = await canvasParaBlob(canvas, qualidade);

  while (blob.size > IMAGEM_ALVO_BYTES && qualidade > 0.4) {
    qualidade -= 0.08;
    blob = await canvasParaBlob(canvas, qualidade);
  }

  if (blob.size > IMAGEM_LIMITE_BYTES) {
    throw new Error(
      "Essa imagem ficou com " + Math.round(blob.size / 1024) +
      " KB mesmo depois de comprimida. Escolha outra foto ou corte a atual antes de enviar."
    );
  }

  var base64 = await blobParaBase64(blob);
  return { blob: blob, base64: base64, width: largura, height: altura, sizeBytes: blob.size };
}

function blobParaBase64(blob) {
  return new Promise(function (resolve, reject) {
    var leitor = new FileReader();
    leitor.onload = function () {
      var resultado = leitor.result;
      var virgula = resultado.indexOf(",");
      resolve(resultado.slice(virgula + 1));
    };
    leitor.onerror = reject;
    leitor.readAsDataURL(blob);
  });
}
