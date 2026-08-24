import { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';

export const safe = (fn: (req: any, res: Response) => Promise<void>) => 
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

export const errorHandler = (error: unknown, _req: Request, res: Response, next: NextFunction) => {
  void next;
  if (error instanceof z.ZodError) {
    return res.status(400).json({ 
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.flatten().fieldErrors } 
    });
  }
  console.error(error);
  return res.status(500).json({ 
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } 
  });
};
