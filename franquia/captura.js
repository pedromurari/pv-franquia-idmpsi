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
        // Clique novo com campanha: grava por cima do que houver. `capturadoEm`
        // é o instante do clique -- precisa dele pra remontar o `_fbc` do Meta
        // caso o cookie não exista (ver `obterFbc`).
        localStorage.setItem(CHAVE_ATRIBUICAO, JSON.stringify({ ...novo, referrerHost, landingPath, capturadoEm: Date.now() }));
      } else if (!localStorage.getItem(CHAVE_ATRIBUICAO)) {
        // Primeira visita sem parâmetro nenhum (direto, orgânico, indicação):
        // guarda só de onde veio, sem inventar campanha.
        localStorage.setItem(CHAVE_ATRIBUICAO, JSON.stringify({ referrerHost, landingPath, capturadoEm: Date.now() }));
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

  // --- Rastreamento Meta: pixel no navegador + Conversions API no servidor ---
  //
  // O mesmo `event_id` vai nos dois caminhos. É isso, e só isso, que faz o
  // Meta entender que são o MESMO lead e contar uma conversão em vez de duas.
  // Se os dois lados mandarem ids diferentes, o relatório dobra.
  function gerarEventId() {
    try {
      if (crypto?.randomUUID) return crypto.randomUUID();
    } catch { /* sem crypto.randomUUID (navegador antigo, contexto não seguro) */ }
    return 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
  }

  function lerCookie(nome) {
    const achado = document.cookie.split('; ').find((item) => item.startsWith(nome + '='));
    return achado ? decodeURIComponent(achado.slice(nome.length + 1)) : '';
  }

  // `_fbp` e `_fbc` são os cookies que o próprio pixel escreve. O CAPI usa os
  // dois pra casar o evento do servidor com a pessoa que o Meta já identificou
  // no navegador -- sem eles, o match piora muito.
  //
  // O `_fbc` só nasce se o pixel estava carregado no momento do clique. Quem
  // clicou no anúncio ANTES do pixel existir tem o fbclid guardado por nós mas
  // nenhum cookie; nesse caso remontamos no formato que o Meta espera:
  // `fb.<indice de subdominio>.<timestamp do clique>.<fbclid>`.
  //
  // Aquele índice NÃO é fixo -- depende de em que nível do domínio o cookie
  // foi gravado (neste site, com `www.` e TLD composto `.com.br`, o próprio
  // Meta usa 2, não 1). Errar o índice faz o Meta descartar o match, então
  // copiamos o que o pixel usou no `_fbp`, que ele grava no mesmo domínio.
  function obterIndiceSubdominio() {
    const fbp = lerCookie('_fbp');
    const partes = fbp.split('.');
    return partes.length >= 2 && /^\d+$/.test(partes[1]) ? partes[1] : '2';
  }

  function obterFbc(atribuicao) {
    const cookie = lerCookie('_fbc');
    if (cookie) return cookie;
    if (!atribuicao.fbclid) return '';
    return 'fb.' + obterIndiceSubdominio() + '.' + (atribuicao.capturadoEm || Date.now()) + '.' + atribuicao.fbclid;
  }

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
    const atribuicao = obterAtribuicao();
    const eventId = gerarEventId();
    try {
      const resposta = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, whatsapp, email, cidade: partes[0] || cidadeEstado,
          estado: partes[1] || '', motivacao, empresa: form.elements.empresa.value,
          consentimento: consent.checked, ...atribuicao,
          eventId, fbp: lerCookie('_fbp'), fbc: obterFbc(atribuicao),
          eventSourceUrl: window.location.href.slice(0, 500) }),
        signal: AbortSignal.timeout(12000),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.mensagem || 'Não foi possível registrar sua solicitação.');
      // Só dispara o Lead depois do 201. Formulário que falhou não é lead, e
      // contar aqui ensinaria o algoritmo a buscar quem não converte.
      try { window.fbq?.('track', 'Lead', {}, { eventID: eventId }); } catch { /* pixel bloqueado -- o CAPI já registrou pelo servidor */ }
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
