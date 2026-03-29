import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../shared/utils/trpc';
import { useExamStore } from '../store/useExamStore';
import { ExamLevel } from '../../database/data/examenes_config';
import { toast } from 'sonner';

export const useExamManager = () => {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [startingExam, setStartingExam] = useState<string | number | null>(null);

  const startLevel = async (level: ExamLevel) => {
    setStartingExam(level.id);
    try {
      let formattedQuestions: any[] = [];

      // If it's a demo, use the static banco if possible FOR SPEED and RELIABILITY
      if (level.isDemo && level.banco && level.banco.length > 0) {
        formattedQuestions = level.banco.map((q, idx) => ({
          id: `demo-${idx}`,
          text: q.text,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          justification: q.justification || 'Revisa el material de estudio.',
          area: q.area || 'Demo',
        }));
      } else {
        // Fetch dynamic questions from the database
        const dbQuestions = await utils.exam.getQuestionsByFilter.fetch({
          school: level.school,
          examId: Number(level.id),
          limit: level.totalPreguntas || 100
        });

        if (!dbQuestions || dbQuestions.length === 0) {
          toast.error('No hay preguntas disponibles en la base de datos para este examen.');
          setStartingExam(null);
          return;
        }

        formattedQuestions = dbQuestions.map((q) => ({
          id: q.id.toString(),
          text: q.question,
          options: q.options as string[],
          correctOptionIndex: q.correctOption,
          justification: 'Consulta el manual para más detalles.',
          area: 'General',
        }));
      }

      useExamStore.getState().iniciarExamen(formattedQuestions);
      navigate('/simulador', { state: { examLevelId: level.id.toString(), modalidad: level.school } });
    } catch (err) {
      console.error('Failed to start exam:', err);
      toast.error('Error al iniciar el simulacro.');
    } finally {
      setStartingExam(null);
    }
  };

  return { startingExam, startLevel };
};
