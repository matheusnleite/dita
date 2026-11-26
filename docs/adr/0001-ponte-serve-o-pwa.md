# A Ponte serve o PWA

Decidimos que a Ponte serve o build do PWA na mesma origem, em vez de hospedar o site separadamente no Cloudflare Pages. Assim o login por cookie, o streaming e o Web Push funcionam sem CORS nem segundo deploy, e o app fica no ar exatamente quando o PC está ligado — que é a regra combinada. O custo aceito é que não existe app disponível com o PC desligado.
