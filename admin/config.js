/* Configuração do painel. O token do GitHub NUNCA entra aqui — fica só no
   localStorage, digitado pelo administrador na primeira vez que usa o painel. */
var CONFIG = {
  repo: { owner: "", name: "", branch: "main" },
  site: {
    nome: "Sul Metropolitano",
    assinatura: "notícias do sul da Grande Curitiba",
    dominio: "https://sulmetropolitano.com.br",
    emailRedacao: "redacao@sulmetropolitano.com.br",
    whatsapp: "",
    instagram: "",
  },
  cidades: [
    { slug: "mandirituba", nome: "Mandirituba" },
    { slug: "fazenda-rio-grande", nome: "Fazenda Rio Grande" },
    { slug: "tijucas-do-sul", nome: "Tijucas do Sul" },
    { slug: "quitandinha", nome: "Quitandinha" },
    { slug: "agudos-do-sul", nome: "Agudos do Sul" },
    { slug: "campo-do-tenente", nome: "Campo do Tenente" },
    { slug: "pien", nome: "Piên" },
  ],
  editorias: [
    "Política",
    "Polícia",
    "Economia e Emprego",
    "Saúde e Educação",
    "Cultura e Lazer",
    "Esporte",
    "Utilidade Pública",
  ],
};
