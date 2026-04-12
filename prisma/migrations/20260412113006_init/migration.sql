-- CreateEnum
CREATE TYPE "BorrowedItemStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PenaltyStatus" AS ENUM ('UNPAID', 'CLEARED');

-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrowers" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "borrowers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_returnable" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrowed_items" (
    "id" SERIAL NOT NULL,
    "borrower_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "quantity" INTEGER NOT NULL,
    "status" "BorrowedItemStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrowed_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penalties" (
    "id" SERIAL NOT NULL,
    "borrower_id" INTEGER NOT NULL,
    "borrowed_item_id" INTEGER NOT NULL,
    "status" "PenaltyStatus" NOT NULL DEFAULT 'UNPAID',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cleared_at" TIMESTAMP(3),

    CONSTRAINT "penalties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "borrowers_username_key" ON "borrowers"("username");

-- CreateIndex
CREATE UNIQUE INDEX "penalties_borrowed_item_id_key" ON "penalties"("borrowed_item_id");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowed_items" ADD CONSTRAINT "borrowed_items_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "borrowers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowed_items" ADD CONSTRAINT "borrowed_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowed_items" ADD CONSTRAINT "borrowed_items_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalties" ADD CONSTRAINT "penalties_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "borrowers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalties" ADD CONSTRAINT "penalties_borrowed_item_id_fkey" FOREIGN KEY ("borrowed_item_id") REFERENCES "borrowed_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
