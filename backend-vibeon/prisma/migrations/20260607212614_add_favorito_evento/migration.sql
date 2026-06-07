-- CreateTable
CREATE TABLE "FavoritoEvento" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoritoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FavoritoEvento_usuarioId_eventoId_key" ON "FavoritoEvento"("usuarioId", "eventoId");

-- AddForeignKey
ALTER TABLE "FavoritoEvento" ADD CONSTRAINT "FavoritoEvento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoritoEvento" ADD CONSTRAINT "FavoritoEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
