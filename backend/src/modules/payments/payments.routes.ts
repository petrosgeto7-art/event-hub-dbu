import { Router } from 'express';
import { paymentsController } from './payments.controller';

const router = Router();

// Chapa verification callback endpoints
// These are called server-to-server by Chapa (no auth needed)
// and also by the frontend after redirect (with auth optional)
router.get('/verify-registration/:tx_ref', paymentsController.verifyRegistrationPayment);
router.get('/verify-workspace/:tx_ref', paymentsController.verifyWorkspacePayment);

export default router;
