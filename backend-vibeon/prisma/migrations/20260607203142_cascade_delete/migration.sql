-- DropForeignKey
ALTER TABLE "Agenda" DROP CONSTRAINT "Agenda_eventoId_fkey";

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
