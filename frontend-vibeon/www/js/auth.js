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
    console.log("Enviando dados para cadastro:", body);
    const data = await apiRequest("/api/auth/cadastro", "POST", body);
    console.log("Resposta do backend:", data);

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
    limparCampo("cadCidade");
    limparCampo("cadCategoria");
    limparCampo("cadDescricao");
    limparCampo("cadEstado");
  } catch (err) {
    console.error("Erro no cadastro:", err);
    showToast(err.message);
  }
}

// Funções para carregar estados e cidades (serão chamadas pelo main.js)
async function carregarEstados() {
  const selectEstado = document.getElementById("cadEstado");
  if (!selectEstado) return;

  try {
    const response = await fetch(
      "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome",
    );
    const estados = await response.json();

    selectEstado.innerHTML = '<option value="">Selecione um estado</option>';
    estados.forEach((estado) => {
      const option = document.createElement("option");
      option.value = estado.sigla;
      option.textContent = estado.nome;
      selectEstado.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar estados:", error);
    showToast("Não foi possível carregar a lista de estados.");
  }
}

async function carregarCidades(siglaUF) {
  const selectCidade = document.getElementById("cadCidade");
  if (!selectCidade) return;

  if (!siglaUF) {
    selectCidade.innerHTML =
      '<option value="">Primeiro selecione um estado</option>';
    selectCidade.disabled = true;
    return;
  }

  selectCidade.disabled = true;
  selectCidade.innerHTML = '<option value="">Carregando cidades...</option>';

  try {
    const response = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${siglaUF}/municipios?orderBy=nome`,
    );
    const cidades = await response.json();

    selectCidade.innerHTML = '<option value="">Selecione uma cidade</option>';
    cidades.forEach((cidade) => {
      const option = document.createElement("option");
      option.value = cidade.nome;
      option.textContent = cidade.nome;
      selectCidade.appendChild(option);
    });
    selectCidade.disabled = false;
  } catch (error) {
    console.error("Erro ao carregar cidades:", error);
    selectCidade.innerHTML =
      '<option value="">Erro ao carregar cidades</option>';
    showToast("Não foi possível carregar a lista de cidades.");
  }
}
