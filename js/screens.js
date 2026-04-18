// ─────────────────────────────────────────────────────────────
//  screens.js — Navegação entre seções da aplicação
//  Futuro: renderização de todas as telas do jogo (home,
//  briefing, quiz, round-result, placar final)
// ─────────────────────────────────────────────────────────────

/**
 * Exibe a seção indicada.
 * 'teoria' | 'como-usar' | 'creditos' → ativa a página longa (teoria + como usar + créditos)
 * 'atividade' → ativa apenas o jogo
 */
function showSection(id) {
  // Desativa tudo
  document.querySelectorAll('.section')
    .forEach(s => s.classList.remove('active'));

  if (id === 'atividade') {
    document.getElementById('sec-atividade').classList.add('active');
    window.scrollTo(0, 0);
  } else {
    // 'teoria', 'como-usar' ou 'creditos' → página longa
    document.getElementById('sec-teoria').classList.add('active');
    document.getElementById('sec-como-usar').classList.add('active');
    document.getElementById('sec-creditos').classList.add('active');

    if (id === 'como-usar' || id === 'creditos') {
      // Scrolla suavemente até a âncora após o DOM estar visível
      setTimeout(() => {
        const anchor = document.getElementById('sec-' + id);
        if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } else {
      window.scrollTo(0, 0);
    }
  }
}
