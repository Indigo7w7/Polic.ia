import fs from 'fs';
import path from 'path';
import { db, exams, examQuestions } from '../../../database/db';
import { eq, and } from 'drizzle-orm';

export interface IngestResult {
  file: string;
  success: boolean;
  importedQuestions?: number;
  error?: string;
  alreadyExists?: boolean;
}

/**
 * Ingests exam JSON files from data/exams into the database.
 * @param overwrite If true, existing exams with the same school and level will be deleted before ingestion.
 */
export async function ingestLocalExams(overwrite = false): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  try {
    const examsDir = path.join(process.cwd(), 'data', 'exams');
    if (!fs.existsSync(examsDir)) {
      console.warn(`[INGEST] Exams directory not found: ${examsDir}`);
      return [];
    }

    const files = fs.readdirSync(examsDir).filter(f => f.endsWith('.json'));
    console.log(`[INGEST] Found ${files.length} exam files.`);

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(examsDir, file), 'utf-8');
        const data = JSON.parse(content);
        
        // Infer level from filename if not in JSON (e.g., EESTP_Level_01.json -> 1)
        const levelMatch = file.match(/(\d+)/);
        const levelNum = data.level || (levelMatch ? parseInt(levelMatch[0], 10) : 1);
        const school = data.school;

        if (!school || !levelNum) {
          results.push({ file, success: false, error: 'Missing school or level in JSON/filename' });
          continue;
        }

        const existing = await db.select().from(exams).where(and(eq(exams.school, school), eq(exams.level, levelNum)));

        if (existing.length > 0) {
          if (!overwrite) {
            results.push({ file, success: true, alreadyExists: true });
            continue;
          }
          // Overwrite mode: Delete existing exam and questions
          const examId = existing[0].id;
          await db.delete(examQuestions).where(eq(examQuestions.examId, examId));
          await db.delete(exams).where(eq(exams.id, examId));
          console.log(`[INGEST] Overwriting ${school} Level ${levelNum}...`);
        }

        // Insert new exam
        const [newExam] = await db.insert(exams).values({
          school: school,
          level: levelNum,
          title: data.title || `Nivel ${levelNum.toString().padStart(2, '0')}`,
          isDemo: levelNum === 1
        });
        const examId = newExam.insertId;

        // Ingest questions
        if (data.questions && data.questions.length > 0) {
          const questionValues = data.questions.map((q: any) => ({
            examId: Number(examId),
            areaId: q.areaId || 1,
            question: q.question,
            options: q.options,
            correctOption: q.correctOption,
            difficulty: q.difficulty || 'MEDIUM',
            schoolType: school
          }));
          await db.insert(examQuestions).values(questionValues);
          results.push({ file, success: true, importedQuestions: data.questions.length });
        } else {
          results.push({ file, success: true, importedQuestions: 0 });
        }
      } catch (err: any) {
        results.push({ file, success: false, error: err.message });
      }
    }
  } catch (error: any) {
    console.error('[INGEST] Global failure:', error);
  }
  return results;
}
