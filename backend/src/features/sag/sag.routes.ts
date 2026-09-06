import { Router } from 'express';
import { 
    createSagController, 
    createSagAsyncController, 
    getSagCreationStatusController,
    getSagController, 
    getAllSagsController, 
    approveSagController, 
    rejectSagController ,
    overrideFailureSagController,
    deleteSagController,
    deleteSagByNumberController
} from './sag.controller';

const router = Router();

// Define routes
router.post('/create', createSagAsyncController);
router.get('/status/:jobId', getSagCreationStatusController);
router.post('/approval/approve', approveSagController);
router.post('/approval/reject', rejectSagController);
router.post('/override-failure', overrideFailureSagController);
router.get('/', getAllSagsController);
router.get('/:id', getSagController);
router.delete('/number/:number', deleteSagByNumberController);
router.delete('/:id', deleteSagController);

export default router;