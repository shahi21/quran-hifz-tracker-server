import { PrismaClient } from "@prisma/client";
import { surahs } from "./seed/surahs.js";
const prisma = new PrismaClient();
async function main() {
    await prisma.surah.createMany({
        data: surahs,
        skipDuplicates: true,
    });
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});
