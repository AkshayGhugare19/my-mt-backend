-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "is_editable" BOOLEAN NOT NULL DEFAULT true;

update permissions set is_editable = false where id = 1;
update permissions set is_editable = false where id = 2;
update permissions set is_editable = false where id = 3;
update permissions set is_editable = false where id = 7;
update permissions set is_editable = false where id = 8;
update permissions set is_editable = false where id = 9;
update permissions set is_editable = false where id = 10;
update permissions set is_editable = false where id = 33;