# 🥋 Hapkido · Memory Arcade

Quiz estático, em português, para memorizar os nomes das técnicas do material de estudo. Visual arcade com neon, botões com efeito de pressão, feedback animado, medidor de combo e efeitos sonoros opcionais.

## Abrir e jogar

Abra [index.html](index.html) em um navegador moderno. Não precisa de instalação, internet ou servidor. Todos os recursos são locais; não há fontes, bibliotecas ou serviços externos.

1. Clique em **Escolher quantidade** para selecionar 10, 20, 30 ou todas.
2. Clique em **Começar** e escolha uma das quatro alternativas.
3. Veja a resposta correta e a explicação; clique em **Próxima pergunta**.
4. Ao terminar, confira o resultado e jogue novamente.

No computador, **A–D** ou **1–4** selecionam as alternativas. Tab e Enter também funcionam. O único campo de texto é a busca na revisão, nunca uma resposta do quiz.

O som começa desligado. Use **Som: OFF/ON** para ativar ou desativar os efeitos sintetizados no navegador. Não há música, cronômetro nem limite de tentativas. A interface respeita a preferência do sistema por movimento reduzido.

## Dados e limites do material

- [golpes.txt](golpes.txt) contém **26 técnicas**, com transcrições dos nomes e significados/descrições em português.
- [dicionario.txt](dicionario.txt) contém somente um endereço de site, não um dicionário estruturado. O acesso à página não estava disponível durante a preparação; seu conteúdo **não** foi incorporado.
- Não há caracteres coreanos (Hangul) na fonte. O jogo usa as **transcrições originais**, conforme autorizado, sem inventar Hangul ou padronizar a romanização.
- O nome está em `romanizacao` e a descrição original em `traducao`. Não foram criadas traduções literais ou descrições extras. Apenas espaços excedentes foram normalizados.
- As três notas sobre **Ap**, **Dut** e **Toliô** estão em [data/dicionario.json](data/dicionario.json), incluindo os exemplos com as grafias originais. Sua associação com os nomes da lista fica explícita pelos IDs. São notas do material, não validação técnica externa.
- As perguntas variam entre nome → significado, significado → nome e notas → nome. Nas pistas, as alternativas excluem outros exemplos da mesma nota para haver uma única resposta correta.
- Cada técnica aparece uma vez por partida. **30 perguntas usa as 26 disponíveis**, com aviso na seleção, sem inventar técnicas nem repetir para preencher.

## Pontuação e progresso

- Acerto: **+10 pontos**. Erro: **0**, sem retirar pontos.
- Bônus ao atingir 3 acertos seguidos: **+5**; 5: **+10**; 10: **+20**.
- Cada marco é premiado uma vez por sequência. Um erro zera a sequência e permite conquistar os marcos novamente. Não há multiplicadores ocultos.
- Uma partida perfeita de 10 perguntas soma **135 pontos**.

O `localStorage` guarda recorde de pontuação, partidas concluídas, total de acertos/erros, maior sequência e erros por técnica. Respostas são registradas imediatamente; partidas e recorde de pontuação, apenas ao concluir. Abandonar uma partida não conta como conclusão.

O progresso pertence ao navegador e endereço usados; abrir pelo arquivo e pelo GitHub Pages pode gerar históricos separados. Não há conta, sincronização ou envio de dados. Se o armazenamento for bloqueado ou estiver inválido, um aviso informa que o jogo usa memória temporária, sem sobrescrever dados inválidos.

## Publicar no GitHub Pages

1. Crie um repositório e envie os arquivos, preservando a estrutura de pastas.
2. Em **Settings → Pages**, escolha **Deploy from a branch**.
3. Selecione a branch `main`, pasta **/ (root)**, e salve.
4. Aguarde a publicação e abra o endereço exibido pelo GitHub.

Não é necessário build. Os caminhos são relativos, inclusive em repositórios publicados em subpastas. Não há dependência de caminhos do computador de origem.

## Estrutura e manutenção

- [index.html](index.html): telas, navegação e diálogos.
- [style.css](style.css): tema arcade e layout responsivo.
- [quiz.js](quiz.js): sorteio, alternativas, pontuação e validação de progresso.
- [script.js](script.js): interface, áudio opcional e persistência.
- [data/golpes.json](data/golpes.json) e [data/dicionario.json](data/dicionario.json): dados editáveis.
- [data/banco.js](data/banco.js): cópia gerada dos JSONs, carregada por script clássico para funcionar também em `file://`, sem `fetch`.
- [tools/prepare-data.mjs](tools/prepare-data.mjs): valida os dados e atualiza o banco.
- [tests/quiz.test.mjs](tests/quiz.test.mjs): testes automatizados usando somente o Node.

Após alterar os JSONs, regenere o banco e execute os testes com Node.js 18 ou superior:

```powershell
node tools\prepare-data.mjs
node --test tests\quiz.test.mjs
```

O Node é necessário apenas para manutenção/testes, não para jogar ou publicar. Ao expandir a lista, atualize também os textos com a quantidade de técnicas na interface.
