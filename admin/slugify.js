/* Geração de slugs a partir de título. Uma vez publicado, o slug de uma
   matéria nunca deve mudar — mudar quebra links já compartilhados. */
function slugify(texto) {
  return (texto || "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugUnico(base, existentes) {
  var slug = slugify(base);
  if (!slug) slug = "materia";
  var candidato = slug;
  var i = 2;
  while (existentes.indexOf(candidato) !== -1) {
    candidato = slug + "-" + i;
    i++;
  }
  return candidato;
}

function editoriaSlug(nomeEditoria) {
  return slugify(nomeEditoria);
}
