import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase';

export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    if (!idToken) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken, true);
    (req as any).user = { uid: decoded.uid, email: decoded.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}


