import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { currencyService } from './currency.service';
import { BadRequestError } from '../../shared/errors/AppError';

const router = Router();

// GET /api/currency/rates
// Returns current exchange rates.
// No auth required — rates are public information.
router.get(
  '/rates',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rates = await currencyService.getCurrentRates();
      res.json({ status: 'success', data: rates });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/currency/convert?from=USD&to=INR&amount=100
// Converts an amount between two currencies.
router.get(
  '/convert',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        from: z.string().min(3).max(3),
        to: z.string().min(3).max(3),
        amount: z.coerce.number().positive(),
      });

      const result = schema.safeParse(req.query);
      if (!result.success) {
        throw new BadRequestError(
          result.error.errors.map((e) => e.message).join(', ')
        );
      }

      const { from, to, amount } = result.data;
      const conversion = await currencyService.convertAmount(
        from,
        to,
        amount
      );

      res.json({ status: 'success', data: conversion });
    } catch (error) {
      next(error);
    }
  }
);

export default router;