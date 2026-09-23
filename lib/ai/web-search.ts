export function shouldUseWebSearch(question: string) {
  const normalized = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!normalized) {
    return false;
  }

  const currentInformationPatterns = [
    /\b(?:temperatura|quantos graus|previsao do tempo|clima|vai chover|esta chovendo|tempo agora|tempo em)\b/,
    /\b(?:noticia|noticias|ultimas noticias|aconteceu hoje)\b/,
    /\b(?:cotacao|preco atual|valor do dolar|valor do euro|bolsa hoje|mercado hoje)\b/,
    /\b(?:placar|resultado do jogo|jogo de hoje|classificacao do campeonato)\b/,
    /\b(?:transito agora|situacao do transito|voo atrasado|status do voo)\b/,
    /\bquem e (?:o |a )?(?:presidente|governador|governadora|prefeito|prefeita|ministro|ministra|ceo)\b/,
    /\b(?:pesquise|busque|procure|consulte) (?:na internet|na web|online)\b/
  ];

  return currentInformationPatterns.some((pattern) => pattern.test(normalized));
}
