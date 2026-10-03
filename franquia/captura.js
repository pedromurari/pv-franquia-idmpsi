(() => {
  const form = document.getElementById('franquia-form');
  const button = form.querySelector('.form-btn');
  const error = document.getElementById('franquia-erro');
  const consent = document.getElementById('franquia-consentimento');
  const endpoint = 'https://bremvrsjmnsvtpgcsgtj.supabase.co/functions/v1/captura-franquia';
  const whatsappUrl = 'https://wa.me/5511916346129?text=' + encodeURIComponent('Olá! Preenchi o formulário e gostaria de agendar a reunião de apresentação da IDM PSI');
  let enviando = false;

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
          consentimento: consent.checked }),
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
