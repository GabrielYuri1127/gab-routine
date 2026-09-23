import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldUseWebSearch } from "../lib/ai/web-search";

describe("assistant selective web search", () => {
  it("uses current information tools for weather and other live facts", () => {
    assert.equal(shouldUseWebSearch("Que dia e hoje? Quantos graus faz em Manaus?"), true);
    assert.equal(shouldUseWebSearch("Quais sao as ultimas noticias de tecnologia?"), true);
    assert.equal(shouldUseWebSearch("Qual e a cotacao do dolar agora?"), true);
    assert.equal(shouldUseWebSearch("Pesquise na internet o resultado do jogo"), true);
  });

  it("keeps routine questions on the cheaper context-only path", () => {
    assert.equal(shouldUseWebSearch("O que devo priorizar hoje?"), false);
    assert.equal(shouldUseWebSearch("Como estao minhas faltas?"), false);
    assert.equal(shouldUseWebSearch("Crie uma tarefa para revisar calculo amanha"), false);
    assert.equal(shouldUseWebSearch("Quanto tempo falta para eu concluir o curso?"), false);
  });
});
