import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Chapa verification callback endpoints (can be called by frontend after redirect)
router.get('/verify-registration/:tx_ref', authenticate, paymentsController.verifyRegistrationPayment);
router.get('/verify-workspace/:tx_ref', authenticate, paymentsController.verifyWorkspacePayment);

export default router;
