import { Router, type IRouter } from "express";
import healthRouter from "./health";
import patientRouter from "./patient";
import codesRouter from "./codes";
import summarizeRouter from "./summarize";
import aiPatientSummaryRouter from "./ai-patient-summary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(patientRouter);
router.use(codesRouter);
router.use(summarizeRouter);
router.use(aiPatientSummaryRouter);

export default router;
