# PianoKids

PWA de piano para crianças: 4 pistas, peças a cair, músicas clássicas de domínio público. Sem login, sem loja, sem ranking.

## Jogar

Abre o site em HTTPS no telemóvel. No menu do navegador escolhe **Adicionar ao ecrã principal** / **Instalar aplicação**.

- **Iniciante** (padrão): ~44 BPM, rampa suave, erros não param a música.
- **Mediano**: ~72 BPM, alguns erros permitidos.
- **Avançado**: ~112 BPM, janela apertada.

Progresso (estrelas e desbloqueio) fica só neste aparelho (`localStorage`).

## Desenvolvimento

```bash
npm install
npm run dev
```

Build estático:

```bash
npm run build
npm run preview
```
