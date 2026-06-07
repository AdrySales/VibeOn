require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const path = require("path"); // ← adicionar
const upload = require("./middlewares/upload");
const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // ← adicionar

// Middleware de autenticação
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ erro: "Token não fornecido" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido" });
  }
}

// Rota inicial
app.get("/", (req, res) => {
  res.json({ message: "API VibeOn funcionando!" });
});

// ----- AUTH -----
app.post("/api/auth/cadastro", async (req, res) => {
  try {
    const { nome, email, senha, telefone, tipo, estabelecimento } = req.body;
    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: { nome, email, senha: senhaHash, telefone, tipo: tipo || "user" },
    });

    // Se for estabelecimento e os dados adicionais foram enviados, cria o perfil
    if (tipo === "estabelecimento" && estabelecimento) {
      await prisma.estabelecimento.create({
        data: {
          usuarioId: usuario.id,
          nomeFantasia: estabelecimento.nomeFantasia || nome,
          endereco: estabelecimento.endereco,
          categoria: estabelecimento.categoria,
          descricao: estabelecimento.descricao || null,
        },
      });
    }

    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET);
    res.status(201).json({
      token,
      usuario: { id: usuario.id, nome, email, tipo: usuario.tipo },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, senha } = req.body;
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) return res.status(401).json({ erro: "Usuário não encontrado" });
  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  if (!senhaValida) return res.status(401).json({ erro: "Senha incorreta" });
  const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET);
  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email, tipo: usuario.tipo },
  });
});

// ----- EVENTOS -----
app.get("/api/eventos", async (req, res) => {
  const { estabelecimentoId } = req.query;
  const where = {};
  if (estabelecimentoId) {
    where.estabelecimentoId = Number(estabelecimentoId);
  }
  const eventos = await prisma.evento.findMany({
    where,
    include: { estabelecimento: { include: { usuario: true } } },
    orderBy: { dataHora: "asc" },
  });
  res.json(eventos);
});

// Buscar evento específico (para edição)
app.get("/api/eventos/:id", async (req, res) => {
  try {
    const eventoId = parseInt(req.params.id);
    const evento = await prisma.evento.findUnique({
      where: { id: eventoId },
      include: { estabelecimento: { include: { usuario: true } } },
    });
    if (!evento) return res.status(404).json({ erro: "Evento não encontrado" });
    res.json(evento);
  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
});

app.post("/api/eventos", auth, upload.single("foto"), async (req, res) => {
  try {
    // Verifica se o usuário é um estabelecimento
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
    });
    if (usuario.tipo !== "estabelecimento") {
      return res
        .status(403)
        .json({ erro: "Apenas estabelecimentos podem criar eventos" });
    }

    // Busca o estabelecimento vinculado
    const estabelecimento = await prisma.estabelecimento.findUnique({
      where: { usuarioId: req.usuarioId },
    });
    if (!estabelecimento) {
      return res
        .status(404)
        .json({ erro: "Perfil de estabelecimento não encontrado" });
    }

    const { nome, descricao, dataHora, preco } = req.body;
    const fotoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const evento = await prisma.evento.create({
      data: {
        estabelecimentoId: estabelecimento.id,
        nome,
        descricao,
        dataHora: new Date(dataHora),
        preco,
        foto: fotoUrl,
      },
    });
    res.status(201).json(evento);
  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
});

// Editar evento (somente o estabelecimento dono)
app.put("/api/eventos/:id", auth, upload.single("foto"), async (req, res) => {
  try {
    const eventoId = parseInt(req.params.id);
    const { nome, descricao, dataHora, preco } = req.body;
    const fotoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    // Verificar se o evento existe e pertence ao estabelecimento do usuário logado
    const evento = await prisma.evento.findUnique({
      where: { id: eventoId },
      include: { estabelecimento: true },
    });
    if (!evento) return res.status(404).json({ erro: "Evento não encontrado" });
    if (evento.estabelecimento.usuarioId !== req.usuarioId) {
      return res.status(403).json({ erro: "Você não é o dono deste evento" });
    }

    // Dados para atualização
    const data = { nome, descricao, dataHora: new Date(dataHora), preco };
    if (fotoUrl) data.foto = fotoUrl;

    const eventoAtualizado = await prisma.evento.update({
      where: { id: eventoId },
      data,
    });
    res.json(eventoAtualizado);
  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
});

// ----- FAVORITOS (ESTABELECIMENTOS) -----
app.get("/api/favoritos", auth, async (req, res) => {
  const favoritos = await prisma.favorito.findMany({
    where: { usuarioId: req.usuarioId },
    include: { estabelecimento: true },
  });
  res.json(favoritos);
});

app.post("/api/favoritos", auth, async (req, res) => {
  const { estabelecimentoId } = req.body;
  try {
    const fav = await prisma.favorito.create({
      data: {
        usuarioId: req.usuarioId,
        estabelecimentoId: Number(estabelecimentoId),
      },
    });
    res.status(201).json(fav);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

app.delete("/api/favoritos/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.favorito.delete({ where: { id } });
  res.status(204).send();
});

// ----- FAVORITOS (EVENTOS) -----
app.get("/api/favoritos-eventos", auth, async (req, res) => {
  const favoritos = await prisma.favoritoEvento.findMany({
    where: { usuarioId: req.usuarioId },
    include: {
      evento: { include: { estabelecimento: { include: { usuario: true } } } },
    },
  });
  res.json(favoritos);
});

app.post("/api/favoritos-eventos", auth, async (req, res) => {
  const { eventoId } = req.body;
  try {
    const fav = await prisma.favoritoEvento.create({
      data: {
        usuarioId: req.usuarioId,
        eventoId: Number(eventoId),
      },
    });
    res.status(201).json(fav);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

app.delete("/api/favoritos-eventos/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.favoritoEvento.delete({ where: { id } });
  res.status(204).send();
});

// ----- AGENDA -----
app.get("/api/agenda", auth, async (req, res) => {
  const agenda = await prisma.agenda.findMany({
    where: { usuarioId: req.usuarioId },
    include: { evento: { include: { estabelecimento: true } } },
  });
  res.json(agenda);
});

app.post("/api/agenda", auth, async (req, res) => {
  const { eventoId } = req.body;
  const item = await prisma.agenda.create({
    data: { usuarioId: req.usuarioId, eventoId: Number(eventoId) },
  });
  res.status(201).json(item);
});

app.delete("/api/agenda/:id", auth, async (req, res) => {
  await prisma.agenda.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

// ----- AVALIAÇÕES -----
app.post("/api/avaliacoes", auth, async (req, res) => {
  const { estabelecimentoId, nota, comentario } = req.body;
  const aval = await prisma.avaliacao.create({
    data: { usuarioId: req.usuarioId, estabelecimentoId, nota, comentario },
  });
  res.status(201).json(aval);
});

app.get("/api/avaliacoes/estabelecimento/:id", async (req, res) => {
  const avaliacoes = await prisma.avaliacao.findMany({
    where: { estabelecimentoId: Number(req.params.id) },
    include: { usuario: true },
  });
  res.json(avaliacoes);
});

// ----- PREMIUM (simulação) -----
app.post("/api/premium/simular", auth, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuarioId },
  });
  if (usuario.tipo !== "estabelecimento")
    return res.status(403).json({ erro: "Apenas estabelecimentos" });
  const estabelecimento = await prisma.estabelecimento.update({
    where: { usuarioId: req.usuarioId },
    data: { premiumSimulado: true },
  });
  res.json({
    mensagem: "Simulação premium ativada",
    premiumAtivo: estabelecimento.premiumSimulado,
  });
});

// ----- PERFIL -----
app.get("/api/usuarios/me", auth, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuarioId },
    include: { estabelecimento: true },
  });
  res.json(usuario);
});

// Rota para upload de foto do usuário logado
app.post(
  "/api/usuarios/me/foto",
  auth,
  upload.single("foto"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ erro: "Nenhuma foto enviada" });
      const fotoUrl = `/uploads/${req.file.filename}`;
      const usuario = await prisma.usuario.update({
        where: { id: req.usuarioId },
        data: { foto: fotoUrl },
      });
      res.json({ foto: usuario.foto });
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  },
);

// Rota para upload de foto do estabelecimento (se o usuário for estabelecimento)
app.post(
  "/api/estabelecimento/foto",
  auth,
  upload.single("foto"),
  async (req, res) => {
    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id: req.usuarioId },
      });
      if (usuario.tipo !== "estabelecimento") {
        return res.status(403).json({ erro: "Apenas estabelecimentos" });
      }
      const estabelecimento = await prisma.estabelecimento.findUnique({
        where: { usuarioId: req.usuarioId },
      });
      if (!estabelecimento)
        return res.status(404).json({ erro: "Perfil não encontrado" });
      if (!req.file)
        return res.status(400).json({ erro: "Nenhuma foto enviada" });
      const fotoUrl = `/uploads/${req.file.filename}`;
      const updated = await prisma.estabelecimento.update({
        where: { id: estabelecimento.id },
        data: { foto: fotoUrl },
      });
      res.json({ foto: updated.foto });
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  },
);

// Rota para upload de foto de evento (requer autenticação e que o usuário seja o dono do evento)
app.post(
  "/api/eventos/:id/foto",
  auth,
  upload.single("foto"),
  async (req, res) => {
    try {
      const eventoId = parseInt(req.params.id);
      if (!req.file)
        return res.status(400).json({ erro: "Nenhuma foto enviada" });

      // Verificar se o evento pertence ao estabelecimento do usuário logado
      const evento = await prisma.evento.findUnique({
        where: { id: eventoId },
        include: { estabelecimento: true },
      });
      if (!evento)
        return res.status(404).json({ erro: "Evento não encontrado" });
      if (evento.estabelecimento.usuarioId !== req.usuarioId) {
        return res.status(403).json({ erro: "Você não é o dono deste evento" });
      }

      const fotoUrl = `/uploads/${req.file.filename}`;
      const updated = await prisma.evento.update({
        where: { id: eventoId },
        data: { foto: fotoUrl },
      });
      res.json({ foto: updated.foto });
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  },
);

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando em http://localhost:${PORT}`);
});
