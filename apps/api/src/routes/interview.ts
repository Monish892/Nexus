import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { safe } from '../utils/errors';
import { authMiddleware } from '../utils/auth';
import { config } from '../config';

export const interviewRouter = Router();
interviewRouter.use(authMiddleware);

const startInput = z.object({
  type: z.string().trim().min(1) // e.g. "React", "System Design", "Behavioral"
});

interviewRouter.post('/start', safe(async (req: any, res) => {
  const input = startInput.parse(req.body);

  const interview = await prisma.interview.create({
    data: {
      userId: req.user.id,
      type: input.type,
      status: 'RUNNING'
    }
  });

  // Generate first question
  let firstQuestion = `Explain your experience and core concepts related to ${input.type}.`;
  
  if (config.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `You are a technical interviewer for ${input.type}. Ask the first technical interview question to assess the candidate. Keep it concise.` }
          ]
        })
      });
      if (response.ok) {
        const aiData = await response.json() as any;
        firstQuestion = aiData.choices[0].message.content;
      }
    } catch (e) {
      console.warn('AI question generation failed');
    }
  }

  const question = await prisma.interviewQuestion.create({
    data: {
      interviewId: interview.id,
      content: firstQuestion,
      order: 1
    }
  });

  res.status(201).json({ data: { interview, currentQuestion: question } });
}));

const answerInput = z.object({
  content: z.string().trim().min(1)
});

interviewRouter.post('/:id/answer', safe(async (req: any, res) => {
  const interviewId = req.params.id;
  const input = answerInput.parse(req.body);

  const interview = await prisma.interview.findFirstOrThrow({
    where: { id: interviewId, userId: req.user.id },
    include: { questions: { orderBy: { order: 'desc' }, take: 1, include: { answer: true } } }
  });

  if (interview.status !== 'RUNNING' || interview.questions.length === 0) {
    res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Interview is not in progress' } });
    return;
  }

  const currentQuestion = interview.questions[0];
  if (currentQuestion.answer) {
    res.status(400).json({ error: { code: 'ALREADY_ANSWERED', message: 'Question already answered' } });
    return;
  }

  let score = 0;
  let feedback = 'Good answer.';
  let nextQuestionContent: string | null = null;
  
  // Basic fallback logic
  const keywords = ['yes', 'no', 'important', 'use', 'function', 'class', 'design', 'because'];
  score = Math.min(10, input.content.split(' ').length > 10 ? 8 : 4);
  
  if (config.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: `You are evaluating a candidate's answer to this question: "${currentQuestion.content}". Provide a JSON response with: score (0-10), feedback (string), nextQuestion (string, or null if the interview should end after this).` },
            { role: 'user', content: input.content }
          ]
        })
      });
      if (response.ok) {
        const aiData = await response.json() as any;
        const result = JSON.parse(aiData.choices[0].message.content);
        score = result.score || score;
        feedback = result.feedback || feedback;
        nextQuestionContent = result.nextQuestion || null;
      }
    } catch (e) {
      console.warn('AI evaluation failed');
    }
  }

  const answer = await prisma.interviewAnswer.create({
    data: {
      interviewQuestionId: currentQuestion.id,
      content: input.content,
      score,
      feedback
    }
  });

  // Generate next question if needed
  let nextQuestion = null;
  if (nextQuestionContent && interview.questions[0].order < 5) { // Limit to max 5 questions
    nextQuestion = await prisma.interviewQuestion.create({
      data: {
        interviewId: interview.id,
        content: nextQuestionContent,
        order: interview.questions[0].order + 1
      }
    });
  } else {
    // Finish interview
    await prisma.interview.update({
      where: { id: interview.id },
      data: { status: 'COMPLETED' }
    });
  }

  res.status(201).json({ data: { answer, nextQuestion } });
}));
