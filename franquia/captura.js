(() => {
  const form = document.getElementById('franquia-form');
  const button = form.querySelector('.form-btn');
  const error = document.getElementById('franquia-erro');
  const consent = document.getElementById('franquia-consentimento');
  const endpoint = 'https://bremvrsjmnsvtpgcsgtj.supabase.co/functions/v1/captura-franquia';
  const whatsappUrl = 'https://wa.me/5511916346129?text=' + encodeURIComponent('Olá! Preenchi o formulário e gostaria de agendar a reunião de apresentação da IDM PSI');
  let token = '';
  let widgetId;
  let enviando = false;

  function atualizarBotao() {
    button.disabled = enviando || !token || !consent.checked;
  }

  function mostrarErro(mensagem) {
    error.textContent = mensagem;
  }

  consent.addEventListener('change', atualizarBotao);

  async function iniciarVerificacao() {
    try {
      const resposta = await fetch('/api/captura-config', { cache: 'no-store' });
      if (!resposta.ok) throw new Error('Formulário temporariamente indisponível. Fale conosco pelo WhatsApp.');
      const { siteKey } = await resposta.json();
      if (!siteKey) throw new Error('Formulário temporariamente indisponível. Fale conosco pelo WhatsApp.');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      widgetId = window.turnstile.render('#franquia-turnstile', {
        sitekey: siteKey,
        callback(valor) { token = valor; mostrarErro(''); atualizarBotao(); },
        'expired-callback'() { token = ''; atualizarBotao(); },
        'error-callback'() { token = ''; atualizarBotao(); mostrarErro('Não foi possível verificar o envio. Atualize a página.'); },
      });
    } catch (falha) {
      mostrarErro(falha instanceof Error ? falha.message : 'Verificação indisponível.');
    }
  }

  window.handleSubmit = async (event) => {
    event.preventDefault();
    if (enviando || !token || !consent.checked) return;
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
          consentimento: consent.checked, token }),
        signal: AbortSignal.timeout(12000),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.mensagem || 'Não foi possível registrar sua solicitação.');
      form.innerHTML = '<p role="status" style="color:#fff;line-height:1.6">Solicitação recebida. Nossa equipe entrará em contato.<br><a href="' + whatsappUrl + '" target="_blank" rel="noopener noreferrer" style="color:#FAB338">Se preferir, fale conosco pelo WhatsApp.</a></p>';
    } catch (falha) {
      mostrarErro(falha instanceof Error ? falha.message : 'Não foi possível enviar. Tente novamente.');
      token = '';
      window.turnstile?.reset(widgetId);
      button.textContent = 'Solicitar reunião gratuita';
    } finally {
      enviando = false;
      if (form.contains(button)) atualizarBotao();
    }
  };

  void iniciarVerificacao();
})();
