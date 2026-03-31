import { db, exams, examQuestions } from '../../database/db';
import { eq, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
async function ingest() {
    console.log('--- Starting Exam Ingestion ---');
    const files = [
        'EO_Level_01.json',
        'EO_Level_02.json',
        'EESTP_Level_01.json',
        'EESTP_Level_02.json'
    ];
    for (const file of files) {
        const filePath = path.join(process.cwd(), 'data', 'exams', file);
        if (!fs.existsSync(filePath)) {
            console.error(`File NOT found: ${filePath}`);
            continue;
        }
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const { school, title, questions } = data;
        const levelNumber = file.includes('01') ? 1 : 2;
        const existing = await db.select()
            .from(exams)
            .where(and(eq(exams.school, school), eq(exams.level, levelNumber)));
        if (existing.length > 0) {
            console.log(`Skipping ${school} Level ${levelNumber} (Already exists)`);
            continue;
        }
        console.log(`Ingesting ${school} Level ${levelNumber}: ${title}...`);
        // 1. Create the exam record
        const [newExam] = await db.insert(exams).values({
            school,
            level: levelNumber,
            title: title || `Nivel ${levelNumber}`,
            isDemo: levelNumber === 1,
        });
        const examId = newExam.insertId;
        // 2. Insert questions
        const questionValues = questions.map((q) => ({
            examId: Number(examId),
            areaId: 1,
            question: q.question,
            options: q.options,
            correctOption: q.correctOption,
            difficulty: 'MEDIUM',
            schoolType: school,
        }));
        await db.insert(examQuestions).values(questionValues);
        console.log(`Successfully ingested ${questions.length} questions for ${school} Level ${levelNumber}.`);
    }
    console.log('--- Ingestion Complete ---');
    process.exit(0);
}
ingest().catch(err => {
    console.error('Ingestion FAILED:', err);
    process.exit(1);
});
