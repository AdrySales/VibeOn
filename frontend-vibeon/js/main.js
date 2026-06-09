// js/main.js

async function carregarPagina(pagina) {
  // Se não for a página Agenda, remove o botão flutuante (caso exista)
  if (pagina !== "agenda") {
    if (typeof removerBotaoAgenda === "function") {
      removerBotaoAgenda();
    } else {
      const btn = document.getElementById("fabAgenda");
      if (btn) btn.remove();
    }
  }

  try {
    const response = await fetch(`pages/${pagina}.html`);
    if (!response.ok) throw new Error("Página não encontrada");
    const html = await response.text();
    document.getElementById("app").innerHTML = html;

    // Executa os carregamentos específicos de cada página
    if (pagina === "home" && typeof carregarHome === "function") carregarHome();
    if (pagina === "agenda" && typeof carregarAgenda === "function")
      carregarAgenda();
    if (pagina === "favoritos" && typeof carregarFavoritos === "function")
      carregarFavoritos();
    if (pagina === "perfil" && typeof carregarPerfil === "function")
      carregarPerfil();
    if (pagina === "mapa" && typeof carregarMapa === "function") carregarMapa();

    // Configura eventos da página de login
    if (pagina === "login") {
      const btnLogin = document.getElementById("btnLogin");
      const mostrarCadastro = document.getElementById("mostrarCadastro");
      if (btnLogin) {
        btnLogin.onclick = () => {
          const email = document.getElementById("loginEmail")?.value;
          const senha = document.getElementById("loginSenha")?.value;
          if (email && senha) login(email, senha);
          else showToast("Preencha email e senha");
        };
      }
      if (mostrarCadastro) {
        mostrarCadastro.onclick = (e) => {
          e.preventDefault();
          carregarPagina("cadastro");
        };
      }
    }

    // Configura eventos da página de cadastro
    if (pagina === "cadastro") {
      // Inicializa os botões de tipo (Usuário/Empresa) e os campos
      const btnUser = document.getElementById("btnTipoUser");
      const btnEmpresa = document.getElementById("btnTipoEmpresa");
      const empresaFields = document.getElementById("empresaFields");
      if (btnUser && btnEmpresa && empresaFields) {
        tipoCadastro = "user";
        btnUser.classList.add("bg-[#7C3AED]", "text-white");
        btnUser.classList.remove("bg-[#1E293B]", "text-[#94A3B8]");
        btnEmpresa.classList.remove("bg-[#7C3AED]", "text-white");
        btnEmpresa.classList.add("bg-[#1E293B]", "text-[#94A3B8]");
        empresaFields.classList.add("hidden");

        btnUser.onclick = () => {
          tipoCadastro = "user";
          btnUser.classList.remove("bg-[#1E293B]", "text-[#94A3B8]");
          btnUser.classList.add("bg-[#7C3AED]", "text-white");
          btnEmpresa.classList.remove("bg-[#7C3AED]", "text-white");
          btnEmpresa.classList.add("bg-[#1E293B]", "text-[#94A3B8]");
          empresaFields.classList.add("hidden");
        };
        btnEmpresa.onclick = () => {
          tipoCadastro = "estabelecimento";
          btnEmpresa.classList.remove("bg-[#1E293B]", "text-[#94A3B8]");
          btnEmpresa.classList.add("bg-[#7C3AED]", "text-white");
          btnUser.classList.remove("bg-[#7C3AED]", "text-white");
          btnUser.classList.add("bg-[#1E293B]", "text-[#94A3B8]");
          empresaFields.classList.remove("hidden");
          // Carrega estados e configura listener do select quando a empresa for selecionada
          carregarEstados();
          const estadoSelect = document.getElementById("cadEstado");
          if (estadoSelect) {
            estadoSelect.onchange = (e) => carregarCidades(e.target.value);
          }
        };
      }

      // Botão de cadastro
      const btnCadastrar = document.getElementById("btnCadastrar");
      const voltarLogin = document.getElementById("voltarLogin");
      if (btnCadastrar) {
        btnCadastrar.onclick = () => {
          const nome = document.getElementById("cadNome")?.value;
          const email = document.getElementById("cadEmail")?.value;
          const senha = document.getElementById("cadSenha")?.value;
          const telefone = document.getElementById("cadTelefone")?.value;
          if (!nome || !email || !senha) {
            showToast("Preencha os campos obrigatórios");
            return;
          }
          if (tipoCadastro === "estabelecimento") {
            const endereco = document.getElementById("cadEndereco")?.value;
            const cidade = document.getElementById("cadCidade")?.value;
            console.log("📌 Cidade capturada no frontend:", cidade);
            if (!endereco) {
              showToast("Informe o endereço do estabelecimento");
              return;
            }
            if (!cidade) {
              showToast("Selecione uma cidade");
              return;
            }
            cadastrar(nome, email, senha, telefone, "estabelecimento", {
              nomeFantasia: nome,
              endereco,
              cidade,
              categoria:
                document.getElementById("cadCategoria")?.value || "bar",
              descricao: document.getElementById("cadDescricao")?.value || "",
            });
          } else {
            cadastrar(nome, email, senha, telefone, "user", null);
          }
        };
      }
      if (voltarLogin) {
        voltarLogin.onclick = (e) => {
          e.preventDefault();
          carregarPagina("login");
        };
      }
    }
  } catch (err) {
    console.error(err);
    document.getElementById("app").innerHTML =
      '<div class="text-red-400 text-center p-8">Erro ao carregar página.</div>';
  }
}

// Navegação pelos botões inferiores
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const screen = btn.dataset.screen;
    if (screen) carregarPagina(screen);
  });
});

// Verifica autenticação inicial
if (token) {
  const userStr = localStorage.getItem("user");
  if (userStr) currentUser = JSON.parse(userStr);
  document.getElementById("bottomNav").classList.remove("hidden");
  carregarPagina("home");
} else {
  carregarPagina("login");
}
