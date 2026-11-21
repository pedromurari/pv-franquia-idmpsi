(() => {
  const form = document.getElementById('franquia-form');
  const button = form.querySelector('.form-btn');
  const error = document.getElementById('franquia-erro');
  const consent = document.getElementById('franquia-consentimento');
  const endpoint = 'https://bremvrsjmnsvtpgcsgtj.supabase.co/functions/v1/captura-franquia';
  const whatsappUrl = 'https://wa.me/5511916346129?text=' + encodeURIComponent('Olá! Preenchi o formulário e gostaria de agendar a reunião de apresentação da IDM PSI');
  let enviando = false;

  // Atribuição de campanha: qual anúncio/campanha trouxe esse visitante até
  // aqui. Só existe no instante da visita -- se não gravar agora, não tem
  // como recuperar depois quando o lead finalmente preencher o formulário.
  //
  // Regra: um clique com parâmetro de campanha (utm_*, fbclid, gclid) sempre
  // substitui o que estava guardado -- é a visita mais recente que trouxe a
  // pessoa de volta. Uma visita direta/orgânica posterior (sem nenhum desses
  // parâmetros) NUNCA apaga uma atribuição de anúncio já guardada; senão
  // alguém que clicou no anúncio ontem e hoje digitou o site de memória
  // perderia a campanha que realmente trouxe ele.
  const CHAVE_ATRIBUICAO = 'idmpsi_atribuicao';
  const CAMPOS_URL = {
    utm_source: 'utmSource', utm_medium: 'utmMedium', utm_campaign: 'utmCampaign',
    utm_content: 'utmContent', utm_term: 'utmTerm', fbclid: 'fbclid', gclid: 'gclid',
  };

  function capturarAtribuicao() {
    try {
      const params = new URLSearchParams(window.location.search);
      const novo = {};
      let temParametro = false;
      for (const [paramUrl, chave] of Object.entries(CAMPOS_URL)) {
        const valor = params.get(paramUrl);
        if (valor) { novo[chave] = valor.slice(0, 255); temParametro = true; }
      }
      let referrerHost = '';
      if (document.referrer) {
        try { referrerHost = new URL(document.referrer).hostname; } catch { /* referrer inválido, ignora */ }
      }
      const landingPath = window.location.pathname.slice(0, 255);
      if (temParametro) {
        // Clique novo com campanha: grava por cima do que houver.
        localStorage.setItem(CHAVE_ATRIBUICAO, JSON.stringify({ ...novo, referrerHost, landingPath }));
      } else if (!localStorage.getItem(CHAVE_ATRIBUICAO)) {
        // Primeira visita sem parâmetro nenhum (direto, orgânico, indicação):
        // guarda só de onde veio, sem inventar campanha.
        localStorage.setItem(CHAVE_ATRIBUICAO, JSON.stringify({ referrerHost, landingPath }));
      }
      // Se já havia atribuição de campanha salva e esta visita é direta, não
      // mexe em nada -- mantém o clique de anúncio anterior.
    } catch { /* localStorage indisponível (modo privado, bloqueio) -- segue sem atribuição */ }
  }

  function obterAtribuicao() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_ATRIBUICAO) || '{}');
    } catch {
      return {};
    }
  }

  capturarAtribuicao();

  function atualizarBotao() {
    button.disabled = enviando || !consent.checked;
  }

  function mostrarErro(mensagem) {
    error.textContent = mensagem;
  }

  consent.addEventListener('change', atualizarBotao);

  window.handleSubmit = async (event) => {
    event.preventDefault();
    if (enviando || !consent.checked) return;
    const campos = form.querySelectorAll('.field input, .field select');
    const [nome, whatsapp, email, cidadeEstado, motivacao] = [...campos].map((campo) => campo.value.trim());
    const partes = cidadeEstado.split(/\s*[-—–/]\s*/);
    enviando = true;
    atualizarBotao();
    mostrarErro('');
    button.textContent = 'Enviando…';
    try {
      const resposta = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, whatsapp, email, cidade: partes[0] || cidadeEstado,
          estado: partes[1] || '', motivacao, empresa: form.elements.empresa.value,
          consentimento: consent.checked, ...obterAtribuicao() }),
        signal: AbortSignal.timeout(12000),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.mensagem || 'Não foi possível registrar sua solicitação.');
      form.innerHTML = '<p role="status" style="color:#fff;line-height:1.6">Solicitação recebida. Nossa equipe entrará em contato.<br><a href="' + whatsappUrl + '" target="_blank" rel="noopener noreferrer" style="color:#FAB338">Se preferir, fale conosco pelo WhatsApp.</a></p>';
    } catch (falha) {
      mostrarErro(falha instanceof Error ? falha.message : 'Não foi possível enviar. Tente novamente.');
      button.textContent = 'Solicitar reunião gratuita';
    } finally {
      enviando = false;
      if (form.contains(button)) atualizarBotao();
    }
  };

  atualizarBotao();
})();
