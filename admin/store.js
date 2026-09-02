/* Rascunho automático no localStorage. Fica só no aparelho: não sincroniza
   entre dispositivos, e é assim de propósito (ver README). */

var RASCUNHO_CHAVE = "sm_rascunho_materia";
var RASCUNHO_INTERVALO_MS = 10000;

function salvarRascunho(dadosFormulario) {
  var pacote = { dados: dadosFormulario, salvoEm: new Date().toISOString() };
  localStorage.setItem(RASCUNHO_CHAVE, JSON.stringify(pacote));
}

function lerRascunho() {
  var bruto = localStorage.getItem(RASCUNHO_CHAVE);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto);
  } catch (e) {
    return null;
  }
}

function apagarRascunho() {
  localStorage.removeItem(RASCUNHO_CHAVE);
}

function iniciarAutosave(coletarDados) {
  return setInterval(function () {
    salvarRascunho(coletarDados());
  }, RASCUNHO_INTERVALO_MS);
}
