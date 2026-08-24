import { Router } from 'express';
import multer from 'multer';
// @ts-ignore
const pdfParse = require('pdf-parse');
import { z } from 'zod';
import { prisma } from '../db';
import { safe } from '../utils/errors';
import { authMiddleware } from '../utils/auth';
import { config } from '../config';

export const resumeRouter = Router();
resumeRouter.use(authMiddleware);

// Store files in memory for processing
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

resumeRouter.get('/', safe(async (req: any, res) => {
  const resumes = await prisma.resume.findMany({
    where: { userId: req.user.id },
    include: { versions: { include: { analysis: true }, orderBy: { version: 'desc' } } },
    orderBy: { updatedAt: 'desc' }
  });
  res.json({ data: resumes });
}));

resumeRouter.post('/upload', upload.single('file'), safe(async (req: any, res) => {
  if (!req.file) {
    res.status(400).json({ error: { code: 'NO_FILE', message: 'No PDF file uploaded' } });
    return;
  }

  // Extract text from PDF
  const pdfData = await pdfParse(req.file.buffer);
  const text = pdfData.text;

  // Simple heuristic parsing (fallback if no AI)
  let parsedData: any = { skills: [], experience: [], education: [] };
  let atsScore = 0;
  const keywords = ['javascript', 'typescript', 'react', 'node.js', 'sql', 'api', 'docker', 'git', 'aws', 'python'];
  const foundKeywords = keywords.filter(k => text.toLowerCase().includes(k));
  atsScore = Math.min(100, foundKeywords.length * 10 + 20); // Basic heuristic score
  
  const missingKeywords = keywords.filter(k => !foundKeywords.includes(k));
  
  const feedback = {
    strengths: foundKeywords.length > 5 ? ['Good keyword coverage'] : [],
    weaknesses: missingKeywords.length > 0 ? ['Missing key industry terms'] : [],
    improvements: ['Quantify your achievements with metrics']
  };

  // If OPENAI_API_KEY is present, we could do a real LLM call here.
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
            { role: 'system', content: 'You are an expert ATS system. Extract structured data from this resume text. Output JSON with: skills (string array), experience (array of objects), education, atsScore (0-100), keywords (string array), missingKeywords (string array), feedback (object with strengths, weaknesses, improvements).' },
            { role: 'user', content: text }
          ]
        })
      });
      if (response.ok) {
        const aiData = await response.json() as any;
        const result = JSON.parse(aiData.choices[0].message.content);
        parsedData = { skills: result.skills || [], experience: result.experience || [], education: result.education || [] };
        atsScore = result.atsScore || atsScore;
        foundKeywords.push(...(result.keywords || []));
        missingKeywords.length = 0;
        missingKeywords.push(...(result.missingKeywords || []));
        Object.assign(feedback, result.feedback || {});
      }
    } catch (e) {
      console.warn('AI Parsing failed, falling back to heuristics');
    }
  }

  // Create or update Resume
  let resume = await prisma.resume.findFirst({
    where: { userId: req.user.id, title: req.file.originalname }
  });

  if (!resume) {
    resume = await prisma.resume.create({
      data: {
        userId: req.user.id,
        title: req.file.originalname,
        fileUrl: `memory://${req.file.originalname}`, // Placeholder since we don't have S3 set up
        isPrimary: true
      }
    });
  }

  const versionCount = await prisma.resumeVersion.count({ where: { resumeId: resume.id } });

  const resumeVersion = await prisma.resumeVersion.create({
    data: {
      resumeId: resume.id,
      version: versionCount + 1,
      parsedData,
      analysis: {
        create: {
          atsScore,
          keywords: foundKeywords,
          missingKeywords: missingKeywords,
          feedback
        }
      }
    },
    include: { analysis: true }
  });

  // Also add some evidence to the skill graph based on found keywords
  if (foundKeywords.length > 0) {
    const scoresBreakdown = { resumeQuality: atsScore };
    await prisma.developerScore.create({
      data: {
        userId: req.user.id,
        overall: atsScore,
        breakdown: scoresBreakdown,
        evidence: { resume: resume.title, keywords: foundKeywords }
      }
    });
  }

  res.status(201).json({ data: { resume, version: resumeVersion } });
}));
