// js/perfil.js

async function carregarPerfil() {
  const container = document.getElementById("conteudo-dinamico");
  if (!container) return;

  try {
    const usuario = await apiRequest("/api/usuarios/me", "GET");
    currentUser = usuario;
    localStorage.setItem("user", JSON.stringify(usuario));

    const isEstabelecimento = usuario.tipo === "estabelecimento";
    const estabelecimento = usuario.estabelecimento;

    let totalFavoritos = 0;
    let totalAgenda = 0;

    if (token) {
      try {
        const favEstab = await apiRequest("/api/favoritos");
        const favEventos = await apiRequest("/api/favoritos-eventos");
        totalFavoritos = favEstab.length + favEventos.length;

        if (!isEstabelecimento) {
          const agenda = await apiRequest("/api/agenda");
          totalAgenda = agenda.length;
        } else {
          if (estabelecimento?.id) {
            const eventosCriados = await apiRequest(
              `/api/eventos?estabelecimentoId=${estabelecimento.id}`,
            );
            totalAgenda = eventosCriados.length;
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }

    const fotoUrl =
      isEstabelecimento && estabelecimento?.foto
        ? estabelecimento.foto
        : usuario.foto || null;

    let html = `
      <div class="bg-[#1E293B] rounded-2xl p-4">
        <div class="flex items-center gap-4 flex-wrap">
          <div class="relative">
            ${
              fotoUrl
                ? `<img src="${API_URL}${fotoUrl}" class="w-20 h-20 rounded-full object-cover border-2 border-[#7C3AED]">`
                : `<div class="w-20 h-20 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-3xl font-bold">${usuario.nome.charAt(0).toUpperCase()}</div>`
            }
            <button id="uploadFotoBtn" class="absolute bottom-0 right-0 bg-[#F59E0B] rounded-full w-7 h-7 flex items-center justify-center text-white text-xs hover:bg-[#D97706] transition">
              <i class="fas fa-camera"></i>
            </button>
          </div>
          <div>
            <p class="text-white font-bold text-lg">${usuario.nome}</p>
            <p class="text-[#94A3B8] text-sm">${usuario.email}</p>
            <p class="text-xs ${isEstabelecimento ? "text-[#22C55E]" : "text-[#7C3AED]"} mt-1">
              ${isEstabelecimento ? "🏢 Estabelecimento" : "👤 Usuário"}
            </p>
          </div>
        </div>
    `;

    if (isEstabelecimento && estabelecimento) {
      html += `
        <div class="mt-4 pt-3 border-t border-[#334155]">
          <p class="text-[#94A3B8] text-xs mb-1">📌 Endereço</p>
          <p class="text-white text-sm">${estabelecimento.endereco}</p>
          <p class="text-[#94A3B8] text-xs mt-2 mb-1">🏷️ Categoria</p>
          <p class="text-white text-sm">${estabelecimento.categoria}</p>
          ${estabelecimento.cidade ? `<p class="text-[#94A3B8] text-xs mt-2 mb-1">🌆 Cidade</p><p class="text-white text-sm">${estabelecimento.cidade}</p>` : ""}
          ${estabelecimento.descricao ? `<p class="text-[#94A3B8] text-xs mt-2 mb-1">📝 Descrição</p><p class="text-white text-sm">${estabelecimento.descricao}</p>` : ""}
          ${estabelecimento.premiumSimulado ? '<p class="text-[#22C55E] text-xs mt-2 font-bold">✨ Premium (simulação ativa)</p>' : ""}
        </div>
      `;
    }

    html += `
        <div class="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#334155] text-center">
          <div><p class="text-white text-xl font-bold">${totalFavoritos}</p><p class="text-[#94A3B8] text-xs">favoritos</p></div>
          <div><p class="text-white text-xl font-bold">${totalAgenda}</p><p class="text-[#94A3B8] text-xs">${isEstabelecimento ? "eventos criados" : "na agenda"}</p></div>
          <div><p class="text-white text-xl font-bold">0</p><p class="text-[#94A3B8] text-xs">avaliações</p></div>
        </div>
        <div class="flex gap-3 mt-4">
          <button id="editarPerfilBtn" class="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-2 rounded-full transition">
            <i class="fas fa-edit"></i> Editar Perfil
          </button>
          <button id="alterarSenhaBtn" class="flex-1 bg-[#1E293B] hover:bg-[#334155] text-white py-2 rounded-full transition">
            <i class="fas fa-key"></i> Alterar Senha
          </button>
        </div>
      </div>
      <button id="logoutBtn" class="w-full mt-4 bg-red-600 hover:bg-red-700 text-white py-2 rounded-full transition">
        Sair
      </button>
    `;

    container.innerHTML = html;

    // Logout
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      token = null;
      currentUser = null;
      document.getElementById("bottomNav").classList.add("hidden");
      carregarPagina("login");
      showToast("Desconectado");
    });

    // Upload de foto (mantido)
    const uploadBtn = document.getElementById("uploadFotoBtn");
    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/jpeg,image/png,image/jpg,image/webp";
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const formData = new FormData();
          formData.append("foto", file);
          try {
            const endpoint = isEstabelecimento
              ? "/api/estabelecimento/foto"
              : "/api/usuarios/me/foto";
            const response = await fetch(`${API_URL}${endpoint}`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });
            const data = await response.json();
            if (response.ok) {
              showToast("Foto atualizada!");
              carregarPerfil();
            } else {
              showToast(data.erro || "Erro no upload");
            }
          } catch (err) {
            showToast("Erro de conexão");
          }
        };
        input.click();
      });
    }

    // Botão Editar Perfil
    document
      .getElementById("editarPerfilBtn")
      ?.addEventListener("click", () => {
        abrirModalEditarPerfil(usuario, estabelecimento);
      });

    // Botão Alterar Senha
    document
      .getElementById("alterarSenhaBtn")
      ?.addEventListener("click", () => {
        abrirModalAlterarSenha();
      });
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<div class="text-red-400 text-center">Erro ao carregar perfil. Tente novamente.</div>';
  }
}

// Modal de edição de perfil
// Modal de edição de perfil
function abrirModalEditarPerfil(usuario, estabelecimento) {
  const isEstabelecimento = usuario.tipo === "estabelecimento";
  const modalDiv = document.createElement("div");
  modalDiv.id = "modalEditarPerfil";
  modalDiv.className =
    "fixed inset-0 flex items-center justify-center z-50 bg-black/70";
  modalDiv.style.backgroundColor = "rgba(0,0,0,0.8)";
  modalDiv.style.backdropFilter = "blur(4px)";

  let html = `
    <div class="bg-[#0F172A] rounded-2xl w-[90%] max-w-[500px] max-h-[85vh] overflow-y-auto border border-[#7C3AED] p-5">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-white text-xl font-bold">Editar Perfil</h3>
        <button id="fecharModalEditar" class="text-[#94A3B8] hover:text-white text-2xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Nome</label>
          <input type="text" id="editNome" value="${usuario.nome.replace(/['"]/g, "&quot;")}" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Email</label>
          <input type="email" id="editEmail" value="${usuario.email.replace(/['"]/g, "&quot;")}" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Telefone</label>
          <input type="tel" id="editTelefone" value="${usuario.telefone || ""}" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
        </div>
  `;

  if (isEstabelecimento && estabelecimento) {
    // Cidade atual para exibir
    const cidadeAtual = estabelecimento.cidade || "";
    html += `
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Nome Fantasia</label>
          <input type="text" id="editNomeFantasia" value="${estabelecimento.nomeFantasia.replace(/['"]/g, "&quot;")}" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Endereço</label>
          <input type="text" id="editEndereco" value="${estabelecimento.endereco.replace(/['"]/g, "&quot;")}" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Cidade</label>
          <div class="flex gap-2">
            <input type="text" id="editCidade" value="${cidadeAtual.replace(/['"]/g, "&quot;")}" 
                  class="flex-1 bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg bg-opacity-50 cursor-default" 
                  readonly
                  placeholder="Clique na lupa para buscar">
            <button id="btnBuscarCidade" type="button" class="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-3 py-2 rounded-lg">
              <i class="fas fa-search"></i>
            </button>
          </div>
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Categoria</label>
          <select id="editCategoria" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
            <option value="bar" ${estabelecimento.categoria === "bar" ? "selected" : ""}>Bar</option>
            <option value="restaurante" ${estabelecimento.categoria === "restaurante" ? "selected" : ""}>Restaurante</option>
            <option value="casa_show" ${estabelecimento.categoria === "casa_show" ? "selected" : ""}>Casa de Show</option>
          </select>
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Descrição</label>
          <textarea id="editDescricao" rows="2" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">${estabelecimento.descricao || ""}</textarea>
        </div>
    `;
  }

  html += `
        <button id="salvarEdicaoPerfil" class="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white py-2 rounded-full mt-2">Salvar Alterações</button>
      </div>
    </div>
  `;
  modalDiv.innerHTML = html;
  document.body.appendChild(modalDiv);

  // Fechar modal principal
  const fechar = document.getElementById("fecharModalEditar");
  const salvar = document.getElementById("salvarEdicaoPerfil");
  const modal = modalDiv;

  fechar.onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  // Para estabelecimentos: adicionar a funcionalidade de busca de cidade
  if (isEstabelecimento) {
    const btnBuscar = document.getElementById("btnBuscarCidade");
    if (btnBuscar) {
      btnBuscar.addEventListener("click", () => {
        abrirSeletorCidade((cidadeNome) => {
          document.getElementById("editCidade").value = cidadeNome;
        });
      });
    }
  }

  salvar.onclick = async () => {
    try {
      const nome = document.getElementById("editNome").value;
      const email = document.getElementById("editEmail").value;
      const telefone = document.getElementById("editTelefone").value;

      await apiRequest("/api/usuarios/me", "PUT", { nome, email, telefone });

      if (isEstabelecimento) {
        const nomeFantasia = document.getElementById("editNomeFantasia")?.value;
        const endereco = document.getElementById("editEndereco")?.value;
        const cidade = document.getElementById("editCidade")?.value;
        const categoria = document.getElementById("editCategoria")?.value;
        const descricao = document.getElementById("editDescricao")?.value;
        await apiRequest("/api/estabelecimento", "PUT", {
          nomeFantasia,
          endereco,
          cidade,
          categoria,
          descricao,
        });
      }

      showToast("Perfil atualizado com sucesso!");
      modal.remove();
      carregarPerfil();
    } catch (err) {
      showToast(err.message);
    }
  };
}

// Função auxiliar: abre um modal simples para selecionar estado e cidade
function abrirSeletorCidade(callback) {
  const overlay = document.createElement("div");
  overlay.id = "seletorCidadeOverlay";
  overlay.className =
    "fixed inset-0 flex items-center justify-center z-[60] bg-black/70";
  overlay.style.backgroundColor = "rgba(0,0,0,0.8)";
  overlay.style.backdropFilter = "blur(4px)";

  overlay.innerHTML = `
    <div class="bg-[#0F172A] rounded-2xl w-[90%] max-w-[400px] border border-[#7C3AED] p-5">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-white text-xl font-bold">Selecionar Cidade</h3>
        <button id="fecharSeletorCidade" class="text-[#94A3B8] hover:text-white text-2xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Estado</label>
          <select id="seletorEstado" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
            <option value="">Carregando estados...</option>
          </select>
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Cidade</label>
          <select id="seletorCidade" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg" disabled>
            <option value="">Selecione um estado primeiro</option>
          </select>
        </div>
        <button id="confirmarCidade" class="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white py-2 rounded-full mt-2">Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const fechar = document.getElementById("fecharSeletorCidade");
  const selectEstado = document.getElementById("seletorEstado");
  const selectCidade = document.getElementById("seletorCidade");
  const confirmar = document.getElementById("confirmarCidade");

  fechar.onclick = () => overlay.remove();
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  // Carregar estados usando a função global (do auth.js)
  async function carregarEstadosLocal() {
    if (typeof carregarEstados === "function") {
      // Preenche o select de estados (o carregarEstados espera um elemento específico)
      // Vamos reimplementar para não conflitar
      try {
        const response = await fetch(
          "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome",
        );
        const estados = await response.json();
        selectEstado.innerHTML =
          '<option value="">Selecione um estado</option>';
        estados.forEach((estado) => {
          const option = document.createElement("option");
          option.value = estado.sigla;
          option.textContent = estado.nome;
          selectEstado.appendChild(option);
        });
      } catch (err) {
        console.error(err);
        selectEstado.innerHTML =
          '<option value="">Erro ao carregar estados</option>';
      }
    } else {
      console.warn("Função carregarEstados não disponível");
    }
  }
  carregarEstadosLocal();

  selectEstado.addEventListener("change", async (e) => {
    const uf = e.target.value;
    if (!uf) {
      selectCidade.innerHTML =
        '<option value="">Selecione um estado primeiro</option>';
      selectCidade.disabled = true;
      return;
    }
    selectCidade.disabled = true;
    selectCidade.innerHTML = '<option value="">Carregando cidades...</option>';
    try {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`,
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
    } catch (err) {
      console.error(err);
      selectCidade.innerHTML =
        '<option value="">Erro ao carregar cidades</option>';
    }
  });

  confirmar.onclick = () => {
    const cidadeNome = selectCidade.value;
    if (cidadeNome) {
      callback(cidadeNome);
      overlay.remove();
    } else {
      showToast("Selecione uma cidade válida");
    }
  };
}

// Modal de alteração de senha
function abrirModalAlterarSenha() {
  const modalDiv = document.createElement("div");
  modalDiv.id = "modalAlterarSenha";
  modalDiv.className =
    "fixed inset-0 flex items-center justify-center z-50 bg-black/70";
  modalDiv.style.backgroundColor = "rgba(0,0,0,0.8)";
  modalDiv.style.backdropFilter = "blur(4px)";

  modalDiv.innerHTML = `
    <div class="bg-[#0F172A] rounded-2xl w-[90%] max-w-[400px] border border-[#7C3AED] p-5">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-white text-xl font-bold">Alterar Senha</h3>
        <button id="fecharModalSenha" class="text-[#94A3B8] hover:text-white text-2xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Senha Atual</label>
          <input type="password" id="senhaAtual" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Nova Senha</label>
          <input type="password" id="novaSenha" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Confirmar Nova Senha</label>
          <input type="password" id="confirmaSenha" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
        </div>
        <button id="salvarNovaSenha" class="w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] py-2 rounded-full mt-2">Alterar Senha</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalDiv);

  const fechar = document.getElementById("fecharModalSenha");
  const salvar = document.getElementById("salvarNovaSenha");
  const modal = modalDiv;

  fechar.onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  salvar.onclick = async () => {
    const senhaAtual = document.getElementById("senhaAtual").value;
    const novaSenha = document.getElementById("novaSenha").value;
    const confirma = document.getElementById("confirmaSenha").value;
    if (!senhaAtual || !novaSenha) {
      showToast("Preencha todos os campos");
      return;
    }
    if (novaSenha !== confirma) {
      showToast("As novas senhas não coincidem");
      return;
    }
    try {
      await apiRequest("/api/usuarios/me/alterar-senha", "POST", {
        senhaAtual,
        novaSenha,
      });
      showToast("Senha alterada com sucesso!");
      modal.remove();
    } catch (err) {
      showToast(err.message);
    }
  };
}
