-- CreateTable
CREATE TABLE "public"."GameMatch" (
    "id" SERIAL NOT NULL,
    "game" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "draw" BOOLEAN NOT NULL DEFAULT false,
    "winnerId" INTEGER,
    "loserId" INTEGER,

    CONSTRAINT "GameMatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."GameMatch" ADD CONSTRAINT "GameMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameMatch" ADD CONSTRAINT "GameMatch_loserId_fkey" FOREIGN KEY ("loserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
