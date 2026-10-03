# Landing page de franquia IDM PSI

Site público em `https://www.idmpsifranquia.com/`, projeto Vercel
`pv-franquia-idmpsi`. O código estático fica em `franquia/`.

O formulário envia para a Edge Function `captura-franquia` do projeto Supabase
separado `bremvrsjmnsvtpgcsgtj`. Esse backend valida os dados e o
consentimento, limita envios por IP e contato, grava em
`franquia_expansao_leads` e responde sucesso somente após a gravação.
O Kanban ADM está no repositório `E:\idmpc-franqueadora`.

O backend exige `CAPTURA_ALLOWED_ORIGINS` e `CAPTURA_RATE_SECRET` como segredos
no Supabase. A chave `service_role` permanece somente na Edge Function. A
landing page não precisa de segredos nem serviços externos além da Vercel e
do Supabase. Erros de gravação não mostram confirmação falsa.
