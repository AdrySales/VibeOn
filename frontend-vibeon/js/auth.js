// js/auth.js

let tipoCadastro = "user"; // 'user' ou 'estabelecimento'

async function login(email, senha) {
  try {
    const data = await apiRequest("/api/auth/login", "POST", { email, senha });
    token = data.token;
    currentUser = data.usuario;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(currentUser));
    showToast(`Bem-vindo, ${currentUser.nome}`);
    document.getElementById("bottomNav").classList.remove("hidden");
    carregarPagina("home");
    if (typeof carregarHome === "function") carregarHome();
  } catch (err) {
    showToast(err.message);
  }
}

async function cadastrar(
  nome,
  email,
  senha,
  telefone,
  tipo,
  estabelecimentoData,
) {
  try {
    const body = { nome, email, senha, telefone, tipo };
    if (tipo === "estabelecimento" && estabelecimentoData) {
      body.estabelecimento = estabelecimentoData;
    }
    console.log("Enviando dados para cadastro:", body); // debug
    const data = await apiRequest("/api/auth/cadastro", "POST", body);
    console.log("Resposta do backend:", data); // debug

    // NÃO armazena token, apenas mostra mensagem e redireciona para login
    showToast(
      tipo === "estabelecimento"
        ? "Estabelecimento cadastrado! Faça login."
        : "Cadastro realizado! Faça login.",
    );
    carregarPagina("login");

    // Limpa os campos do formulário de cadastro
    const limparCampo = (id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    };
    limparCampo("cadNome");
    limparCampo("cadEmail");
    limparCampo("cadSenha");
    limparCampo("cadTelefone");
    limparCampo("cadEndereco");
    limparCampo("cadCategoria");
    limparCampo("cadDescricao");
  } catch (err) {
    console.error("Erro no cadastro:", err);
    showToast(err.message);
  }
}
