// js/perfil.js

async function carregarPerfil() {
  const container = document.getElementById("conteudo-dinamico");
  if (!container) return;

  try {
    const usuario = await apiRequest("/api/usuarios/me", "GET");
    // Dentro do evento de upload, após atualizar a foto:
    currentUser = await apiRequest("/api/usuarios/me", "GET");
    localStorage.setItem("user", JSON.stringify(currentUser));

    const isEstabelecimento = usuario.tipo === "estabelecimento";
    const estabelecimento = usuario.estabelecimento;

    // URL da foto (se existir)
    const fotoUrl =
      isEstabelecimento && estabelecimento?.foto
        ? estabelecimento.foto
        : usuario.foto || null;

    // HTML com foto e botão de upload
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
          ${estabelecimento.descricao ? `<p class="text-[#94A3B8] text-xs mt-2 mb-1">📝 Descrição</p><p class="text-white text-sm">${estabelecimento.descricao}</p>` : ""}
          ${estabelecimento.premiumSimulado ? '<p class="text-[#22C55E] text-xs mt-2 font-bold">✨ Premium (simulação ativa)</p>' : ""}
        </div>
      `;
    }

    html += `
        <div class="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#334155] text-center">
          <div><p class="text-white text-xl">-</p><p class="text-[#94A3B8] text-xs">favoritos</p></div>
          <div><p class="text-white text-xl">-</p><p class="text-[#94A3B8] text-xs">agenda</p></div>
          <div><p class="text-white text-xl">-</p><p class="text-[#94A3B8] text-xs">avaliações</p></div>
        </div>
      </div>
      <button id="logoutBtn" class="w-full mt-4 bg-red-600 hover:bg-red-700 text-white py-2 rounded-full transition">
        Sair
      </button>
    `;

    container.innerHTML = html;

    // Evento de upload de foto
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
              carregarPerfil(); // recarrega a tela
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

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        token = null;
        currentUser = null;
        document.getElementById("bottomNav").classList.add("hidden");
        carregarPagina("login");
        showToast("Desconectado");
      };
    }
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<div class="text-red-400 text-center">Erro ao carregar perfil. Tente novamente.</div>';
  }
}
