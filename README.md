# Arte Além Cast

Site institucional do Arte Além Cast.

## YouTube automático

A seção **Últimos episódios** usa a YouTube Data API v3 para:

- localizar o canal pelo handle `@Artealémcast`;
- descobrir a playlist oficial de uploads;
- carregar automaticamente os 5 vídeos públicos mais recentes;
- usar título, thumbnail, descrição, data e link do próprio YouTube.

A chave utilizada no frontend deve permanecer restrita no Google Cloud a:

- **API:** YouTube Data API v3
- **Site:** `https://ridecodetech.github.io/artealemcast/*`

Como a chave é usada por JavaScript no navegador, ela é visível no código-fonte. A segurança depende das restrições de origem e de API configuradas no Google Cloud.

## Publicação

Repositório:
`https://github.com/RideCodeTech/artealemcast`

GitHub Pages:
`https://ridecodetech.github.io/artealemcast/`
