# Landing page de franquia IDM PSI

Site público em `https://www.idmpsifranquia.com/`, projeto Vercel
`pv-franquia-idmpsi`. O código estático fica em `franquia/`; a rota
`/api/captura-config` expõe somente a chave **pública** do Cloudflare Turnstile.

O formulário envia para a Edge Function `captura-franquia` do projeto Supabase
separado `bremvrsjmnsvtpgcsgtj`. Esse backend valida o token Turnstile no
servidor, grava em `franquia_expansao_leads` e responde sucesso somente após
a gravação. O Kanban ADM está no repositório `E:\idmpc-franqueadora`.

Para ativar o formulário em produção:

1. Criar um widget Turnstile para `www.idmpsifranquia.com` e
   `www.idmpsifranquia.com.br` (e os domínios sem `www`, caso sejam usados).
2. Configurar `TURNSTILE_SITE_KEY` na Vercel deste site, nos ambientes de
   produção e prévia que serão testados. A chave é pública.
3. Configurar `CAPTURA_TURNSTILE_SECRET` **somente** nos segredos do Supabase
   da franquia. Nunca colocá-la no HTML ou em variáveis públicas.
4. Confirmar `CAPTURA_ALLOWED_ORIGINS` e `CAPTURA_ALLOWED_HOSTNAMES` na Edge
   Function, publicar a função e validar um envio real controlado, conferindo
   o registro no funil ADM.

Sem a chave pública, `/api/captura-config` responde 503 e o formulário fica
desabilitado. Erros de gravação não mostram confirmação falsa. O código foi
publicado em 02/10/2026 com o formulário indisponível e um link direto para
WhatsApp até a configuração do Turnstile.
