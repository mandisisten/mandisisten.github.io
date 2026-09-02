# Sul Metropolitano

Portal de notícias hiperlocal para sete municípios do sul da Região Metropolitana
de Curitiba: Mandirituba, Fazenda Rio Grande, Tijucas do Sul, Quitandinha, Agudos
do Sul, Campo do Tenente e Piên.

Site estático publicado pelo GitHub Pages. Sem servidor, sem banco de dados, sem
build. Um painel (`admin.html`) gera o HTML e grava tudo direto no repositório
do GitHub, usando a API do GitHub. O leitor recebe HTML puro.

## Como o projeto é organizado

- **`/dados/`** — a fonte da verdade. Arquivos JSON com o conteúdo de cada
  matéria, vaga, obituário, evento de agenda e anunciante.
- **HTML nas outras pastas** (`/`, `/{cidade}/`, `/n/{slug}/`, `/editoria/{slug}/`,
  etc.) — o artefato. Gerado a partir dos dados. Nunca edite esses arquivos à
  mão: a próxima publicação os sobrescreve.
- **`/assets/site.css`** — toda a aparência do site, num arquivo só. Trocar uma
  cor ou fonte aqui muda todas as páginas já publicadas, sem regerar nada.
- **`/admin.html` + `/admin/*.js`** — o painel. É onde a geração de HTML
  acontece, no seu navegador, antes de gravar no GitHub.

## Primeiros passos

1. **Crie um repositório público no GitHub.** O GitHub Pages gratuito exige
   repositório público — não tem como usar um privado no plano free.

2. **Ative o GitHub Pages.** Em Settings → Pages, escolha a branch `main` e a
   pasta raiz (`/`). Aguarde a primeira publicação.

3. **Gere um token de acesso pessoal fine-grained.** Em
   Settings → Developer settings → Personal access tokens → Fine-grained tokens:
   - Repository access: apenas este repositório.
   - Permissions → Contents: **Read and write**. Não marque mais nada.
   - Validade: 90 dias. Anote a data e renove antes de vencer — sem o token,
     o painel para de publicar (mas o site continua no ar normalmente).

4. **Abra `admin.html`** (direto do navegador, por duplo clique, ou pelo
   endereço publicado — `admin.html` também funciona pelo GitHub Pages).
   Preencha usuário/organização do GitHub, nome do repositório e branch, cole
   o token e entre. Esses dados ficam salvos só neste aparelho
   (`localStorage`), nunca em código nem em commit.

5. **Aponte o domínio.** No registro.br, cadastre os quatro registros A do
   GitHub Pages apontando para o domínio raiz, e um CNAME apontando `www` para
   `SEU-USUARIO.github.io`. Confirme os IPs atuais na documentação do GitHub
   Pages antes de cadastrar — eles mudam de tempos em tempos. O arquivo
   `/CNAME` deste repositório já está preenchido com
   `sulmetropolitano.com.br`; troque se o domínio real for outro.

6. **Ative HTTPS obrigatório** em Settings → Pages, depois que o DNS
   propagar (pode levar algumas horas).

7. **Cadastre o site no Google Search Console** e envie `sitemap.xml`.

## Publicando o primeiro conteúdo

Com o painel aberto e conectado, vá em Matérias → "Nova matéria", preencha os
campos e publique. Isso grava vários arquivos em **um único commit** — a
matéria, o índice, a home, a página da cidade, a página da editoria, o
sitemap e o feed. O site leva de **20 a 60 segundos** para atualizar depois
do commit. Para urgência real (ex.: uma tragédia acontecendo agora), o canal
de WhatsApp sai primeiro; a matéria no site vem depois.

## Sobre o rascunho automático

O editor de matéria salva um rascunho no `localStorage` a cada 10 segundos.
Esse rascunho **fica só neste aparelho** e não sincroniza com nenhum outro —
de propósito: o repositório do GitHub Pages é público, e um rascunho
commitado seria um rascunho legível por qualquer pessoa antes de você
terminar de escrever. Se você escreve de mais de um aparelho, o rascunho não
vai acompanhar.

## Sobre o painel ser público

`admin.html` é servido pelo GitHub Pages como qualquer outra página — não tem
como escondê-lo de verdade. Ele leva `<meta name="robots" content="noindex">`
e entra no `Disallow` do `robots.txt` para não aparecer em buscas, mas quem
souber o endereço consegue abri-lo. **Isso não é o problema**: sem o seu
token, ninguém consegue publicar nada. Quem protege o painel é o token, não a
obscuridade do endereço.

## Limites do plano gratuito — e o que fazer quando chegarem

- **1 GB de repositório.** Quando passar de uns 700 MB, mova as imagens mais
  antigas (por ano, por exemplo) para um segundo repositório público e
  reaponte os caminhos `/img/...` das matérias antigas para lá — sem tocar
  nas páginas já publicadas.
- **100 GB de banda por mês.** Não deve ser um problema para um portal
  hiperlocal, mas fique de olho se alguma matéria viralizar fora da região.
- **10 builds por hora.** É por isso que toda publicação grava tudo em um
  único commit. Nunca publique matéria por matéria em sequência rápida se
  puder juntar as alterações antes.

## Regerar o site inteiro

Configurações → "Regerar site inteiro" reconstrói todas as páginas a partir
dos dados atuais, também em um único commit. Use depois de mudar algo no
código dos templates (`admin/templates.js`), ou se alguma página parecer
fora de sincronia com os dados.

## O que ainda não existe (de propósito)

Estas ideias foram deixadas de fora por enquanto — nada impede de construir
depois, se fizer falta:

- Rascunho sincronizado entre aparelhos, via gist secreto (exigiria um token
  clássico com escopo `gist`, além do token fine-grained usado hoje).
- Newsletter por RSS a partir do `feed.xml` já gerado.
- Contador de visualizações sem servidor.
- Migração para WordPress ou outra plataforma maior — só cogitar quando
  entrar uma segunda pessoa na redação, quando a publicidade legal exigir
  comprovação formal, ou acima de umas 100 mil visualizações por mês.
